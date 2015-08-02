/**
 *  react-iconpack is a library to make automating SVG/PNG icon usage in React
 *  a bit more streamlined. It consists of a few key components:
 *
 *      - A Babel transformer/plugin that determines which SVG
 *          files you actually want to load, straight from your
 *          source.
 *
 *      - An easy to use <Icon.../> React JSX tag that ties in with
 *          this library.
 *
 *      - A Browserify plugin that will grab your SVG files, optimize
 *          them, and auto-inject them into your bundle as a require()-able
 *          module. The <Icon.../> tag will also transparently handle adding
 *          things to the browser document for you.
 *
 *      - Bonus: For browsers that don't support PNG (e.g, IE8) you can
 *          instruct IconPacker to build a module with base64'd PNGs.
 *
 *      Found a bug, use Webpack, need binary pngs instead of base64?
 *      Send a pull request. :)
 */

var SVGO = require('svgo'),
    fs = require('fs'),
    async = require('async'),
    through = require('through2'),
    merge = require('lodash/object/merge'),
    ReactSVGComponentFilePath = require.resolve('./components/svg.js'),
    im, pngquant;

// Optional dependencies
try {
    pngquant = require('node-pngquant-native');
    im = require('gm').subClass({
        imageMagick: true
    });
} catch(e) {
    // Nothing to do here
}


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
    this._internalSVGDirectory = __dirname + '/svgs/';

    this.opts = merge({
        verbose: false,
        mode: 'svg',

        // JSX tags to pick up
        JSXTagNames: ['Icon'],
        injectReactComponent: true,
        iconLibraryNamespace: 'react-iconpack-icons',
        
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
                {removeEmptyAttrs: false} // I find this helpful, others may not.
            ]
        },
        
        png: {
            antialias: true,
            density: 1000,
            width: 32,
            quality: 90,
            compressorQuality: [60, 80],
            background: 'rgba(0,0,0,0)',
            speed: 3,
            ie6fix: false
        }
    }, options);
  
    // This is our grand database of SVGs. A great @TODO here would
    // be some caching, but I've yet to hit speed limitations where I've
    // really needed it. Pull requests welcome!
    this.SVGS = {};

    // Basic binding() and such for pieces we use later on in the lifepsan
    // of this object. See the respective methods for more details.
    this.svgo = new SVGO(this.opts.svgo);
    this.JSXSVGTracker = this._SVGTracker.bind(this);
    this.BrowserifyInjector = this._BrowserifyInjector.bind(this);
    this.readAndOptimizeSVGs = this._readAndOptimizeSVGs.bind(this);

    // PNG mode might not be needed or desired by some people so I don't see a reason
    // to make them screw around with extra dependencies. For those who opt into it,
    // let's check and ensure that they've got the required modules installed.
    //
    // gm not being around is an error; pngquant is a nice-to-have but we can technically
    // run without it.
    if(this.opts.mode === 'png') {
        if(!im)
            throw new Error(
                'PNG mode, but no trace of Node gm.\n' +
                'You probably want to run:\n\n"npm install gm"\n\n and make sure ' +
                'that ImageMagick is installed with librsvg support. On a Mac ' +
                'with Homebrew, this would be something like:\n\n' +
                'brew install imagemagick --with-librsvg\n\n'
            );
        
        if(!pngquant)
            console.warn(
                'PNG mode, but no trace of pngquant. Compilation will continue ' +
                'but PNGs may be un-optimized. To fix this you probably want to run:' +
                '\n\nnpm install node-pngquant-native\n\n'
            )   
    }
 
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
            return callback(e, null);
        });
    });
};


/**
 *  A Babel "plugin/transformer" that just tracks unique <Icon.../>
 *  JSX tags in your source code. Note that this does absolutely no
 *  modifications - just accumulates the unique SVG uris for the mapping.
 *
 *  @param {Object} babel This will be auto-passed, most likely, by Babel.
 *  @returns {Object} babel.Transformer used for the babel'ing. You know the one.
 */
IconPacker.prototype._SVGTracker = function(babel) {
    var packer = this;
    
    return new babel.Transformer('react-iconpack', {
        JSXElement: function JSXElement(node, parent, scope, file) {
            if(packer.opts.JSXTagNames.indexOf(node.openingElement.name.name) < 0)
                return;

            var attributes = node.openingElement.attributes,
                l = attributes.length,
                i = 0;

            for(; i < l; i++) {
                if(attributes[i].name.name !== 'uri') 
                    continue;

                packer.SVGS[attributes[i].value.value] = 1; 
            }
        }
    });
};


/**
 *  A Browserify plugin that hooks in to the Browserify build pipeline and injects
 *  your icons and a tag as a require()-able module.
 *
 *  If you use another module loader or something I'm sure you can probably figure
 *  it out. 
 *  
 *  Originally I wanted to find a way to just have Babel shove this in, but I 
 *  couldn't figure out a way to do it cleanly so this works. If you use Webpack
 *  and would like to see a plugin like this, pull requests are welcome.
 *
 *  Note: you almost never need to call this yourself; you really just wanna pass
 *  it to Browserify instead. See the full documentation for more details.
 *
 *  @param {Object} browserify An instance of Browserify for this to hook into.
 *  @param {String} imgType Either "png" or "svg".
 *  @returns {Object} browserify The instance being operated on.
 */
IconPacker.prototype._BrowserifyInjector = function(browserify, opts) {
    var startListeningToThisCompleteMessOfALibraryAgain = function() {
        browserify.pipeline.get('pack').unshift(this.compile());
    }.bind(this);

    browserify.external('react-iconpack');
    browserify.external('react-iconpack-icons');
    browserify.on('reset', startListeningToThisCompleteMessOfALibraryAgain);
    startListeningToThisCompleteMessOfALibraryAgain();
    return browserify;
};


/**
 *  Handles actually compiling the SVG (or PNG) assets into a module, then passing
 *  it into the build stream for inclusion in the final bundle. I'll note that this
 *  was a massive PITA to decipher how to do - comments are your friends, Node devs.
 *
 *  This is the only method that is "callback-hell"-ish, but I've chosen not to break
 *  it up because it still fits on one screen of code and is follow-able enough.
 *
 *  @returns {Function} A through2 stream in object mode, which Browserify needs.
 */
IconPacker.prototype.compile = function() {
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
                
                if(packer.opts.mode === 'png') {
                    packer.compilePNGs.call(packer, function PNGComplete(code) {
                        icons.source = code;
                        stream.push(icons);
                        next();
                    });
                } else {
                    icons.source = packer.compileSVGs.call(packer);
                    stream.push(icons);
                    next();
                }
            });            
        });
    }
    
    return through.obj(write, end);
};


/**
 *  Compiles the currently loaded SVGs into a JS module, in preparation for
 *  injection into the bundle. The outputted code is optimized slightly readability,
 *  for debugging and so on. SVG and PNG module output are slightly different structure-wise
 *  as with SVG we attach some extra data (viewBox) that PNGs don't need.
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

    var code = 'module.exports = {\n    mode: "svg",\n\n';
    code += '    icons: {\n';
    for(; i < l; i++) {
        key = keys[i];
        var viewBox = null;
        matches = viewBoxRegex.exec(this.SVGS[key].data);
        if(matches)
            viewBox = matches[1];
        
        code += '        "' + key + '": {\n';
        code += '            props: {viewBox: ' + (viewBox ? '"' + viewBox + '"' : null) + '},\n';
        code += "            data: '" + this.SVGS[key].data.replace('<\/svg>', '')
            .replace(/<\s*svg.*?>/ig, '') + "',\n},\n";
    }

    return code + '}\n};\n';
};


/**
 *  Converts the loaded SVGS into PNGs then returns a JS module, in preparation for
 *  injection into the bundle. 
 *
 *  Somewhat confusingly, though, both compile___() methods in this library "return"
 *  Strings, because Browserify needs that.
 *  
 *  @param {Function} hollaback Called when all the PNGs be converted and the code's done.
 */
IconPacker.prototype.compilePNGs = function(hollaback) {
    var packer = this,
        keys = Object.keys(this.SVGS);
    
    async.map(keys, packer.convertSVGtoPNG.bind(packer), function(error, pngs) {
        var i = 0,
            l = keys.length,
            code = 'module.exports = {\n    mode: "png",\n    icons: {\n';

        for(; i < l; i++) {
            code += '        "' + keys[i] + '": "' + pngs[i] + '",\n';
        }

        // Remove that dangling "," from the end I guess. Probably don't need to
        // as Babel/et al would handle it but whatever.
        hollaback(code.slice(0, -1) + '\n    }\n};\n');
    });
};


/**
 *  A method that uses ImageMagick to convert SVGs to PNGs. This scratches a personal
 *  itch of the author, who really doesn't feel like running a headless browser in the
 *  background for a task as simple as converting a bunch of images.
 *
 *  If you experience bad quality conversions with ImageMagick, you likely need to
 *  install it with librsvg support. For instance, on a Mac with homebrew:
 *
 *      brew install imagemagick --with-librsvg
 *
 *  Ta-da, you should be getting solid conversions now. If you routinely have issues
 *  with this you should be able to easily monkeypatch this to use something like 
 *  Phantom or... something. See the docs for details.
 *
 *  @param {String} key A key for the internal SVGS object.
 *  @param {Function} callback A callback that runs when the PNG is ready.
 */
IconPacker.prototype.convertSVGtoPNG = function(key, callback) {
    var packer = this,
        xml = '<?xml version="1.0" encoding="utf-8"?>',
        patch = '<svg width="32" height="32" preserveAspectRatio="xMidYMid meet" ',
        svg = new Buffer(xml + this.SVGS[key].data.replace('<svg ', patch));
    
    // I'll be honest, chaining APIs annoy me - just lemme use an options object.
    im(svg).background(this.opts.png.background).quality(this.opts.png.quality)
    .antialias(this.opts.png.antialias).density(this.opts.png.density)
    .resize(this.opts.png.width).trim()
    .toBuffer('PNG', function(error, buffer) {
        if(error) {
            console.warn('Warning: Could not convert ' + key + ' - ' + error);
            return callback(error, buffer);
        }
        
        // Optimize and convert the buffer to base64 data
        var quanted = pngquant ? pngquant.compress(buffer, {
            speed: packer.opts.png.speed,
            quality: packer.opts.png.compressorQuality,
            iebug: packer.opts.png.ie6fix
        }) : buffer;
        callback(error, quanted.toString('base64'));
    });
};


// You get that thing I sent ya?
module.exports = IconPacker;
