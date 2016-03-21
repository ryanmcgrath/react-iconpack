/**
 *  WebpackPlugin.js
 *
 *  The Webpack plugin for react-iconpack. Manages intercepting the 
 *  build/loader/etc processes and injecting the SVG icon set as a module.
 *
 *  @author Ryan McGrath <ryan@rymc.io>
 */
var path = require('path'),
    ReactSVGComponentFilePath = require.resolve('../components/svg.js'),
    IconStubComponentPath = require.resolve('../components/react-iconpack-icons.js');


/**
 *  WebpackPlugin
 *
 *  Accepts a packer, and options for configuring the packer instance itself.
 *  @Note: You likely don't want this, but the API in index.js.
 *
 *  @param {Object} packer An instance of IconPacker (see lib/IconPacker.js).
 *  @param {Object} opts Options for configuring IconPacker (for certain use cases it's ideal to update here).
 *  @returns {Object} WebpackPlugin A new Webpack plugin.
 */
var WebpackPlugin = function(packer, opts) {
    this.packer = packer;
    this.packer.update(opts);
    return this;
};


/**
 *  WebpackPlugin.loader()
 *
 *  This is Webpack-specific functionality, which is why it's here - not looking
 *  to overly pollute index.js. This should be .call()'d with the loader context from
 *  index.js, along with the options.
 *
 *  @param {Object} engine The engine object from index.js, which is just the source code.
 *  @param {Object} packer The packer object from index.js, shared amongst everything.
 *  @returns {void}
 */
WebpackPlugin.loader = function(engine, packer) {
    var callback = this.async();
    packer.compileForWebpack(function(source) {
        callback(null, engine.replace('module.exports = {react_iconpack_icons: {}};', source));
    });
};


/**
 *  This prototype.apply chain satisfies the Webpack plugin API. To be quite honest, the
 *  documentation surrounding Webpack plugin development is (almost, but not quite) as bad
 *  as Browserify. Really annoying to decipher.
 *
 *  What we essentially do here is the following:
 *
 *      - With each attempt to resolve a module, we check to see if it's one of our
 *      react-icon-* modules. With both of them, we redirect the request to a file in
 *      the component directory. This stops Webpack from blowing up and lets us provide
 *      a nicer API.
 *
 *      - After module resolution is done, we check to see if the one being passed is
 *      the icons file. We specifically want to apply a loader (our index.js file) to
 *      replace the module source code with our true icons source code.
 *
 *  This takes advantage of how Webpack consumes loaders. I originally wanted to make use
 *  of the compilation.addModule call but I could not figure out that undocumented... thing for
 *  the life of me (creating a RawModule and adding it did nothing).
 */
WebpackPlugin.prototype.apply = function(compiler) {
    var packer = this.packer;   
   
    compiler.plugin('normal-module-factory', function(nmf) {
        nmf.plugin('before-resolve', function(result, callback) {
            if(!result)
                return callback();
            
            // We'll patch them in later... (see index.js)
            if(/react-iconpack-icons$/.test(result.request))
                result.request = IconStubComponentPath;
            
            // Inject react-iconpack Component
            // To do this we actually want to redirect the require statement directive
            // to the proper file~
            if(/react-iconpack$/.test(result.request))
                result.request = ReactSVGComponentFilePath;
            
            callback(null, result);
        });

        // This callback function parameter isn't even in the damn docs, just guessed at it...
        // At any rate, if the icons module is detected we push our loader to the front of it
        // What's nice is that we can do it ourselves and not require the user to do more configuration
        // Note: this is called for every module, so the check is important.
        nmf.plugin('after-resolve', function(data, callback) {
            if(/react-iconpack-icons\.js/.test(data.request))
                data.loaders.unshift(path.join(__dirname, '../index.js'));
            callback(null, data);
        });
    });
};

module.exports = WebpackPlugin;
