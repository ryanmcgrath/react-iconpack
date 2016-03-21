/**
 *  A Browserify plugin that hooks in to the Browserify build pipeline and injects
 *  your icons and a tag as a require()-able module.
 *
 *  Originally I wanted to find a way to just have Babel shove this in, but I 
 *  couldn't figure out a way to do it cleanly so this works.
 *
 *  Note: you almost never need to call this yourself; you really just wanna pass
 *  it to Browserify instead. See the full documentation for more details.
 *
 *  @param {Object} browserify An instance of Browserify for this to hook into.
 *  @param {Object} opts Options for the icon packer instance itself.
 *  @returns {Object} browserify The instance being operated on.
 */
module.exports = function(browserify, opts) {
    this.update(opts);

    var startListeningToThisCompleteMessOfALibraryAgain = function() {
        browserify.pipeline.get('pack').unshift(this.compileForBrowserify());
    }.bind(this);

    browserify.external('react-iconpack');
    browserify.external('react-iconpack-icons');
    browserify.on('reset', startListeningToThisCompleteMessOfALibraryAgain);
    startListeningToThisCompleteMessOfALibraryAgain();
    return browserify;
};
