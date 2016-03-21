/**
 *  react-iconpack is a library to make automating SVG/PNG icon usage in React
 *  a bit more streamlined. It consists of a few key components:
 *
 *      - A Babel (6) transformer/plugin that determines which SVG
 *          files you actually want to load, straight from your
 *          source.
 *
 *      - An easy to use <Icon.../> React JSX tag that ties in with
 *          this library.
 *
 *      - A Webpack plugin that will grab your SVG files, optimize
 *          them, and auto-inject them into your bundle as a require()-able
 *          module. The <Icon.../> tag will also transparently handle adding
 *          things to the browser document for you.
 *
 *      Found a bug? Send a pull request. :)
 */
var IconPacker = require('./lib/IconPacker'),
    BabelSVGTracker = require('./lib/BabelSVGTracker'),
    attachBrowserifyInjector = require('./lib/attachBrowserifyInjector'),
    WebpackPlugin = require('./lib/WebpackPlugin'),
    packer;


/**
 *  This thing responds differently depending on the environment.
 *
 *      - If the engine is "webpack", it returns a function to build a new
 *      Webpack plugin/IconPacker combo in a way that syntactically makes sense
 *      in a webpack.config.js scenario.
 *
 *      - If the engine is "browserify", then it returns a function to attach a
 *      handler to a Browserify bundler automagically.
 *
 *      - If .types exists, then it's (most likely) babel trying to load it - babel.types
 *      is the standard API for babel plugins. We return an <Icon> tracker plugin in this
 *      case.
 *
 *      - If no engine is specified, then it returns a Webpack loader. We do this to handle
 *      actually injecting the icons into the source code, because the Webpack API is really
 *      not clear on how to extend it like this.
 *
 *  The reason for this scenario is that in a Webpack plugin it's nigh-impossible to
 *  specify anything other than a simple package import for a plugin (insofar as I can tell).
 *  This method allows configuration to occur in a way that's easy for people to reason about:
 *  in either Browserify or Webpack, just add "react-iconpack" to the "plugins" list, and then
 *  use the appropriate plugin itself and everything happens automatically behind the scenes.
 *
 *  This all relies on how modules work behind the scenes - once called, they're cached and
 *  return the same stuff on repeated require() calls. This allows us to share 1 packer between
 *  a Webpack/Browserify plugin and the Babel SVG <Icon> tracker. The tracker accumulates calls, the
 *  plugins inject the necessary module code.
 *
 *  @param {String} engine The engine to use, or nothing if you want the Babel plugin.
 *  @returns {Object} engine A different object depending on how this was called. See above.
 */
module.exports = function(engine) {
    if(typeof packer === 'undefined')
        packer = new IconPacker({});
    
    if(engine === 'webpack') {
        return function(opts) {
            return new WebpackPlugin(packer, opts);
        };
    } else if(engine === 'browserify') {
        return {
            attachBrowserifyInjector: function(browserify, opts) {
                return attachBrowserifyInjector.call(packer, browserify, opts);
            }
        };
    } else if(engine.types) { // babel.types
        return BabelSVGTracker.call(packer, engine);
    }

    // This should only ever be called for the icons module itself, and for Webpack only.
    // With Browserify we're able to just inject things properly.
    WebpackPlugin.loader.call(this, engine, packer);
};
