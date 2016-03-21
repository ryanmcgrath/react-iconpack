/**
 *  iconpacker.js
 *
 *  This just encapsulates the core icon-packer functionality. index.js
 *  is the main entry point to care about insofar as usage.
 *
 *  @author Ryan McGrath <ryan@rymc.io
 */
var SVGO = require('svgo'),
    fs = require('fs'),
    async = require('async'),
    through = require('through2'),
    merge = require('lodash').merge,
    cache = require('./cache/fs-cache.js'),
    ReactSVGComponentFilePath = require.resolve('../components/svg.js');


/**
 *  IconPackerer constructor.
 *
 *  @constructor
 *  @param {Object} options Options
 *  @return {Object} An instance of IconPacker to do things with.
 */
var IconPacker = function(options) {
    if(!(this instanceof IconPacker))
        return new IconPacker(options);

    // This is a reference to the directory where we've got
    // provided SVG files held. The user can specify a root directory of
    // their own in the options below; we'll always check theirs first, falling
    // back to checking ours if there's no hit.
    this._internalSVGDirectory = __dirname + '/../svgs/';
    
    // This is our grand database of SVGs. We do some caching here to see if we have
    // an existing batch of SVGs loaded.
    this.SVGS = {};
    
    // Configure our options, if applied here
    this.opts = {};
    this.update(options);

    // Basic binding() and such for pieces we use later on in the lifepsan
    // of this object. See the respective methods for more details.
    this.svgo = new SVGO(this.opts.svgo);
    this.readAndOptimizeSVGs = this._readAndOptimizeSVGs.bind(this);
    
    return this;
};


IconPacker.prototype.update = function(options) {
    this.opts = merge({
        verbose: false,

        // JSX tags to pick up
        JSXTagNames: ['Icon'],
        
        // We provide some default SVGO options that work well for the icons in this
        // project; users can override but keep in mind that it's ill-advised at the time
        // of writing this to remove the viewBox attributes. This may change in a later release.
        //
        // (Removing the viewBox can cause very wonky issues in IE, and it helps to size the various icons).
        svgSourceDirectory: '',
        svgo: {
            plugins: [
                {removeViewBox: false}, // See note above ---^
                {removeUselessStrokeAndFill: false}, // This can clobber some icons, just leave it.
                {removeEmptyAttrs: false}, // I find this helpful, others may not.
                {removeDimensions: true}
            ]
        }        
    }, this.opts, options);

    return this;
};


/**
 *  Handles async reading in all the SVG files and optimizing them. Really
 *  nothing too special here - just async.map'd later on down the file.
 *
 *  @param {Function} callback Upon completion this junks runs.
 */
IconPacker.prototype._readAndOptimizeSVGs = function(key, callback) {
    var packer = this,
        internalFilePath = this._internalSVGDirectory + key + '.svg',
        filePath = packer.opts.svgSourceDirectory + key + '.svg';

    var onSVGOComplete = function(result) {
        packer.SVGS[key] = result;
        callback(null, result);
    };

    fs.readFile(filePath, 'utf8', function(error, data) {
        if(!error)
            return packer.svgo.optimize(data, onSVGOComplete);

        fs.readFile(internalFilePath, 'utf8', function(e, d) {
            if(!e)
                return packer.svgo.optimize(d, onSVGOComplete);

            console.warn('Warning: Could not load ' + key);
            delete packer.SVGS[key]; // Better to error out on the client, I think
            return callback(e, null);
        });
    });
};

/**
 *  Handles actually compiling the SVG assets into a module Browserify module, then passing
 *  it into the build stream for inclusion in the final bundle. I'll note that this
 *  was a massive PITA to decipher how to do - comments are your friends, Node devs.
 *
 *  This is the only method that is "callback-hell"-ish, but I've chosen not to break
 *  it up because it still fits on one screen of code and is follow-able enough.
 *
 *  @returns {Function} A through2 stream in object mode, which Browserify needs.
 */
IconPacker.prototype.compileForBrowserify = function() {
    var packer = this,
        write = function(buf, enc, next) {
            next(null, buf);
        };
    
    var end = function(next) {
        var keys = Object.keys(packer.SVGS),
            stream = this;

        async.map(keys, packer.readAndOptimizeSVGs, function(error, results) {
            fs.readFile(ReactSVGComponentFilePath, 'utf8', function(e, data) {
                stream.push({
                    id: 'react-iconpack',
                    externalRequireName: 'react-iconpack',
                    standaloneModule: 'react-iconpack',
                    hasExports: true,
                    source: data,
                    
                    // An empty deps object is important here as we don't want to
                    // accidentally bundle a second copy of React or the icons as
                    // they're require()'d in the source. Don't change this.
                    deps: {}
                });

                var icons = {
                    id: 'react-iconpack-icons',
                    externalRequireName: 'react-iconpack-icons',
                    standaloneModule: 'react-iconpack-icons',
                    hasExports: true,
                    deps: {}
                };
                
                icons.source = packer.compileSVGs.call(packer);
                stream.push(icons);
                next();
            });            
        });
    }
    
    return through.obj(write, end);
};

/**
 *  Whereas Browserify requires a really annoying Stream setup, Webpack is much more
 *  straightforward. Thus, internally there's two separate compile methods for this stuff.
 *
 *  @param {Function} callbackfn A callback for when the module is ready, as it's async in nature.
 *  @returns {String} module The bundled module.
 */
IconPacker.prototype.compileForWebpack = function(callbackfn) {
    var keys = Object.keys(this.SVGS);
    async.map(keys, this.readAndOptimizeSVGs, function(error, results) {
        callbackfn(this.compileSVGs());
    }.bind(this));
};


/**
 *  Compiles the currently loaded SVGs into a JS module, in preparation for
 *  injection into the bundle. The outputted code is optimized slightly for readability,
 *  debugging and so on.
 *
 *  Side note: yes, parsing "HTML/XML/etc" with regex is dumb. This is also totally fine
 *  for right now though.
 *
 *  @returns {String} The source for this "module" as a String, which Browserify needs.
 */
IconPacker.prototype.compileSVGs = function() {
    var keys = Object.keys(this.SVGS),
        key,
        i = 0,
        l = keys.length,
        viewBoxRegex = /<svg.*?viewBox="(.*?)"/,
        matches;

    var code = 'module.exports = {\n';
    code += '    icons: {\n';
    for(; i < l; i++) {
        key = keys[i];
        var viewBox = null;
        matches = viewBoxRegex.exec(this.SVGS[key].data);
        if(matches)
            viewBox = matches[1];
        
        code += '        "' + key + '": {\n';
        code += '            props: {viewBox: ' + (viewBox ? '"' + viewBox + '"' : null) + '},\n';
        code += "            data: '" + (this.SVGS[key].data ? this.SVGS[key].data.replace('<\/svg>', '')
            .replace(/<\s*svg.*?>/ig, '') : "") + "',\n},\n";
    }

    return code + '}\n};\n';
};

module.exports = IconPacker;
