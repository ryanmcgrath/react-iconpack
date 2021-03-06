/**
 *  This is a React JSX tag that will take care of managing injecting the
 *  icons properly after they've been compiled into your bundle. As long as you're
 *  using the Browserify or Webpack plugin this will "just work" - if you'd like to see plugins
 *  for other platforms, submit a pull request!
 *
 *  Note that this file is liberally commented; React is pretty intuitive but I prefer
 *  if people can easily decipher what I'm trying to accomplish and learn from it. You
 *  may have a different style, but try to follow it here if you modify this.
 *
 *  @author Ryan McGrath <ryan@rymc.io>, contributors (see repo)
 *  @license MIT
 *  @repo https://github.com/ryanmcgrath/react-iconpack/
 */

var React = require('react');
var icons = require('react-iconpack-icons');

/**
 *  A very basic and simple wrapper around console.warn, for debug purposes.
 *
 *  @param {String|Object|Number|Array} A thing, which you may want, to send.
 */
var warn = function(msg) {
    if(typeof console !== 'undefined' && typeof console.warn === 'function')
        console.warn(msg);
};


/**
 *  The main JSX tag you'll be wanting. For any global
 *  styling needs you can safely target the "react-iconpack-icon" class in CSS - you
 *  can also add your own, of course, but there's one there for convenience.
 *
 *  @class
 */
module.exports = React.createClass({
    /**
     *  More or less internal method for React; just configures an initial default
     *  setup for properties. You can refer to this as a general guide on what you
     *  should pass in.
     *
     *  @returns {Object} A default property configuration for this Component.
     */
    getDefaultProps: function() {
        return {
            width: 0,
            height: 0,
            uri: null,
            role: 'img',
            title: '',
            desc: '',

            // Experienced SVG users can override this as necessary but I'm
            // interested in providing an easier solution, not the slight headache that
            // SVG can be.
            //
            // If you desire to pass a new viewBox, do it as a String in the format of 
            // '0 0 0 0'.
            viewBox: null,
            preserveAspectRatio: 'xMidYMid meet',

            // Currently (July 2015ish~) this appears to be the best method for
            // working with screen readers. It is entirely possible that an implementer
            // would want to set this entire node as aria-hidden, though - I believe
            // that will override this for accessibility purposes but I'm totally open
            // to being corrected on this.
            'aria-labeledby': 'title desc'
        }
    },

    /**
     *  These just describe what a typical <SVG/> Component instance
     *  needs. Not everything is required, and we automatically try to map certain
     *  SVG properties to their <img> counterparts if we can (and need to).
     */
    propTypes: {
        uri: React.PropTypes.string.isRequired,

        // I've often found myself using these two types interchangeably in
        // day to day React coding, and I chalk it up to years of writing HTML. Thus,
        // we just accept both types for width and height values.
        width: React.PropTypes.oneOfType([
            React.PropTypes.number,
            React.PropTypes.string
        ]).isRequired,

        height: React.PropTypes.oneOfType([
            React.PropTypes.number,
            React.PropTypes.string
        ]).isRequired,
        
        // These are not explicitly required, but users can certainly pass them in
        // if they have need to.
        viewBox: React.PropTypes.string,
        preserveAspectRatio: React.PropTypes.string,
        role: React.PropTypes.string,
        'aria-labeledby': React.PropTypes.string
    },

    /**
     *  This is a pretty standard thing here, but it's 2AM so I'll document it anyway.
     *  For possible performance reasons we do a few checks here to see if it's even
     *  worth bothering with the re-rendering and the what not for this Component. This
     *  is very shallow, but at the end of the day we don't care about complex Objects or
     *  Arrays or what not being passed to this Component. If you do that, you're doing
     *  it wrong.
     *
     *  Considering it's essentially a glorified image tag it's likely worth it. We
     *  explicitly don't care about state here; IF YOU MODIFY THIS COMPONENT TO CARE
     *  ABOUT STATE YOU ARE RESPONSIBLE FOR ALSO MODIFYING THIS METHOD.
     *
     *  @param {Object} nextProps Properties supplied by whatever is updating this.
     *  @param {Object} nextState State supplied by whatever is updating this (N/A).
     *  @returns {Boolean} A boolean value indicating whether React should do anything.
     */
    shouldComponentUpdate: function(nextProps, nextState) {
        var p = this.props,
            np = nextProps,
            k;
 
        if(this.props === np)
            return false;        
       
        for(k in p)
            if(p.hasOwnProperty(k) && (!np.hasOwnProperty(k) || p[k] !== np[k]))
                return true;

        for(k in np)
            if(np.hasOwnProperty(k) && !p.hasOwnProperty(k))
                return true;

        return false;
    },

    /**
     *  We provide some default stuff
     *  that makes working with an SVG tag a bit more like working with an IMG tag.
     *
     *  @returns {Object} A JSX SVG tag configured and what not.
     */
    render: function() {
        var path,
            accessibility,
            icon,
            props = {};
        
        accessibility = '<title>' + this.props.title + '</title>';
        accessibility += '<desc>' + this.props.desc + '</desc>';

        // If it's missing there's likely no reason to inject anything else
        // at all, I don't think... maybe something else should happen here for
        // accessibility purposes? Not sure.
        if(!icons.icons[this.props.uri]) {
            warn('Warning: Icon missing for ' + this.props.uri);
            return null;
        } else {
            icon = icons.icons[this.props.uri];
            path = accessibility + icon.data;
            if(icon.props.viewBox !== null)
                props.viewBox = icon.props.viewBox;
        }
        
        for(var prop in this.props) {
            if(prop === 'uri' || prop === 'title' || prop === 'desc')
                continue;
            
            // We always want our specific className here, for target-ability
            // between modes. User should always be able to append theirs though.
            if(prop === 'className') {
                props.className = 'react-iconpack-icon ' + this.props.className;
                continue;
            }

            // We provide a default viewBox for all our icons; user should always be
            // able to override though, and their own custom icons may require doing so.
            //
            if(prop === 'viewBox') {
                if(this.props.viewBox !== null) {
                    props.viewBox = this.props.viewBox;
                }
                   
                continue;
            }

            props[prop] = this.props[prop];
        }

        // We avoid the use of JSX in this file as it doesn't undergo parsing by
        // Babel (or any JSX parser, for that matter) due to where it's injected in
        // the build system(s). Luckily this isn't too verbose or anything.
        return React.createElement('svg', React.__spread({}, props, {
            dangerouslySetInnerHTML: {__html: path}
        }));
    }
});
