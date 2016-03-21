/**
 *  A Babel "plugin/transformer" that just tracks unique <Icon.../>
 *  JSX tags in your source code. Note that this does absolutely no
 *  modifications - just accumulates the unique SVG uris for the mapping.
 *
 *  @param {Object} babel This will be auto-passed, most likely, by Babel.
 *  @returns {Object} babel.Transformer used for the babel'ing. You know the one.
 */
module.exports = function(babel) {
    var _packer = this;

    return {
        visitor: {
            JSXElement: function JSXElement(node, parent, scope, file) {
                if(_packer.opts.JSXTagNames.indexOf(node.node.openingElement.name.name) < 0)
                    return;

                var attributes = node.node.openingElement.attributes,
                    l = attributes.length,
                    i = 0;

                for(; i < l; i++) {
                    if(attributes[i].name.name !== 'uri') 
                        continue;
                    _packer.SVGS[attributes[i].value.value] = 1; 
                }
            }
        }
    };
};
