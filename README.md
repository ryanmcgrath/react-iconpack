react-iconpack
==============
This project provides a way to utilize SVG icons in React-based projects with easy fallback to PNGs for browsers that don't have SVG support. It provides three pieces:

- A **Babel plugin**, to track which SVGs you're using in your codebase in order to bundle only those specific graphics. No more shipping assets that you don't even use. 

- A **Browserify plugin** that handles the behind-the-scenes aspects of creating your icon library as a require()-able JS module and injecting it into your bundle. This plugin also handles injecting a lightweight React Component which can be utilized to reference graphics.

- The aforementioned **React Component**, which transparently handles mapping between SVG and IMG tags in various browsers. It's optimized to be fast, and comes with no external dependencies beyond React itself.

- _**Bonus:**_ react-iconpack ships with **over 1,000 ready to use SVG icons** from various different open source projects. Hit the ground running and avoid the tedious task of gathering all the assets you need.

Installation and Usage
==============
react-iconpack is currently delivered via npm; if there's some other module vendor system that people want to utilize open a pull request and I'll take a look at it.

    npm install react-iconpack

Configuration is pretty straightforward - create an instance of IconPacker and supply the options you want. There are some sensible defaults which are highlighted below.


``` javascript
var IconPacker = require('react-iconpack');

var packer = new IconPacker({
    // If you need more details about the packing process 
    verbose: false,

    // An Array of JSX tags that you want this to catch - helpful
    // for overriding.
    JSXTagNames: ['Icon'],

    // Which mode this is running in
    mode: 'svg',

    // Optional: You can provide your own SVG source directory here.
    // IconPacker will then look here for any custom-supplied icons.
    svgSourceDirectory: null,

    // IconPacker uses svgo behind the scenes, and can pass your
    // configuration directly to the SVGO constructor/instance.
    svgo: {
        plugins: [
            {removeViewBox: false}, // We tend to need this kept around
            {removeUselessStrokeAndFill: false}, // Can munge graphics
            {removeEmptyAttrs: false} // Can be useful to keep around
        ]
    },

    // When you're in PNG mode you can use this object to control
    // various options in regards to how your PNG fallbacks are
    // rendered. See the "PNG Mode" section below for more details.
    png: {
        antialias: true,
        density: 1000, // Helps for creating crisp PNGs
        width: 32, // A general width they'll all be exported to
        quality: 90, // A hint to the PNG generator, 0 - 100
        compressorQuality: [60, 80], // Optional PNGQuant quality range
        background: 'rgba(0,0,0,0)', // Provides transparency
        speed: 3, // PNGQuant again - value between 1 and 10
        ie6fix: false // Supported by PNGQuant but you'll never need it
    }
});

```

Now that you've got your packer set up, you'll need to enable two plugins in your build. First up is the Browserify plugin - this needs to come before the Babel plugin/transform.

``` javascript
// Your Browserify setup, whatever it is
var browserify = require('browserify'),
    myBundler = browserify({'...': '...'});

myBundler.plugin(packer.BrowserifyInjector, {});
```

With that set, we just need to add the Babel plugin:

``` javascript
var babelify = require('babelify');

myBundler.transform(babelify.configure({
    plugins: [packer.JSXSVGTracker]
}));
```

You're now good to go! These two plugins will talk to each other and handle creating an on-the-fly bundle of the icons you use. An example of your client-side (ES6) code might be:

``` javascript
import React from 'react';
import Icon from 'react-iconpack';

class IconShowcase extends React.Component {
    render() {
        return <Icon uri="polymer/notification/disc_full" width="48" height="48"/>;
    }
}
```

To view the available default icons, your best bet is to clone this repo and scope out the _svgs_ folder yourself. When I have time I'll build a github pages site to preview them all or something. Polymer, Font-Awesome and a few others are all available.

The React Component
==============
The included React Component handles a lot of annoying stuff for you. The breakdown of supported properties is below:

```javascript
{
    width: 0,
    height: 0,
    
    // The icon identifier to be specified.
    uri: null,
    
    // react-iconpack default icons come preconfigured with a viewBox
    // so that you don't have to think about it, but if you ever need
    // to, you can override it here.
    viewBox: null,
    
    // This is defaulted as I've found it helps scaling in some 
    // browsers. YMMV, so override as need be!
    preserveAspectRatio: 'xMinYMin meet',
    
    // Accessibility traits! This component will handle mapping between
    // accessibility requirement differences between <svg> and <img>
    // tags for you. PNG variants using <img> tags will have their title
    // and desc data set as alt text. Insofar as I can tell, this is
    // the most cross-browser solution for icon-accessibility traits.
    role: 'img',
    title: '',
    desc: '',
    'aria-labeledby': 'title desc'
}
```

I should note that this component always tried to take accessibility into account, but like any project bugs can randomly come up. Do file a bug if you see any issues with this.

Adding Your Own Custom Icons
==============
It's really easy! Design your icons, export the SVG, and make sure there's a viewBox property set. Drop it into your root folder, and set the **svgSourceDirectory** configuration property of your packer. URI lookups are just folder structures - e.g:

```
...uri="polymer/notification/disc_full"...

    becomes
    
.../folder/polymer/notification/disc_full.svg
```

PNG Mode
==============
SVGs are great, but sometimes you have to support browsers that can't really use them. Such browsers may be, but are also not limited to:

- Internet Explorer 8 (and down, I guess)
- Older versions of Android's stock web browser

Now, with that said, I take a very opinionated approach on this - IE8 is the only thing worth supporting here. Older versions of Android already have a horrendously negative user experience on any pure-JS app, which anything involving React will likely be. IE8 still sees use in some areas where users can't (surprisingly, I know) upgrade their browser, and being that it's typically on a desktop machine the performance can more or less keep up.

If you're building a website, honestly, React isn't something you should be using - a website and a web application are two very different beasts. If you find yourself building the former, you may be served better by one of the following projects:

- **[Iconizr](https://github.com/jkphl/node-iconizr)** 
- **[svg-sprite](https://github.com/jkphl/svg-sprite)**

They're both very related, but they're more based around the needs of a typical website development workflow.

If you're on board with all of that and you need to support IE8, let's get started by making sure some extra dependencies are installed. We use ImageMagick for generating PNGs; every single project I see uses PhantomJS behind the scenes but this drives me crazy as it's somewhat buggy and the idea of running a browser instance just to generate graphics is ridiculous.

***OS X, using Homebrew:***
```sh
# --with-librsvg is very important. ImageMagick will produce some
# horrible quality PNGs without it.
brew install imagemagick --with-librsvg
```

**Ubuntu:**
```sh
# I believe librsvg is default'd on most *nix's, but someone please
# correct me if I'm wrong.
sudo apt-get install librsvg2-dev imagemagick
```

**Install node-graphicsmagick:** 
```sh
npm install gm
```

**_Optional:_ Install PNGQuant**
```sh
npm install node-pngquant-native
```

This is an optional installation because the PNGQuant installation could throw weird errors at points - if it fails you can still do PNG conversions, they just won't be nearly as optimized.


**Finally:** 

With that all said and done, it's as simple as swapping the mode from _'svg'_ to _'png'_. In PNG mode, the library will convert the SVGs you're using into base64 PNG equivalents. IE8 has a ~32kb PNG URI limit, but so far I've yet to find an icon that crosses that.

```javascript
var IconPacker = require('react-iconpack');
var packer = new IconPacker({
    mode: 'png',
    png: {
        // Your desired options, if applicable
    }
});
```

It's the author's recommendation that you just create a second build for IE8, as it's really the only browser where PNG data would be useful at this point. Pull requests are welcome to improve rendering and so forth.


Frequently Asked Questions
==============
- **Why not supply an icon font?**
Because, personally speaking, I just find it ridiculous. Yes, it works, and I've used it to great effect in the past just as many of you have - but it feels outside the build and mentally it's just this other "thing" to consider. Use it if you like it, and hey, pull request it if you want it in here - it's just not my thing.
- **Why don't you support ____ system?** Probably because I don't use it. I'm not against supporting any other systems, but I'm opting to rely on pull requests to do so as I don't have the time to dig into the nuances of every single one out there.

Contributions
==============
Pull requests (and other contributions) are welcome! This applies to anyone, be they coding or contributing graphics.

- If you are contributing code, great! Please keep it clean and document it. You don't have to be as liberal as I am about it, but I prefer vendoring code that can actually be deciphered.
- If you're providing icons, great! Please be sure to leave the "viewBox" attribute in your source, and segment your icons into their own folder.

Versioning
==============
This project is maintained under the Semantic Versioning guidelines. This Release/versioning policy is based off of the policy used by **[](https://github.com/FortAwesome/Font-Awesome)**, as it seems like it works well there. Releases will be done with the following format:

&lt;major&gt;.&lt;minor&gt;.&lt;patch&gt;

And constructed with the following guidelines:

- Breaking backward compatibility bumps the major (and resets the minor and patch)
- New additions, including new icons, without breaking backward compatibility bumps the minor (and resets the patch)
- Bug fixes and misc changes bumps the patch

For more information on SemVer, please visit **[http://semver.org/](http://semver.org/)**.

Acknowledgements/Legal
==============
This project supplies icons from a variety of creators, each of whom may have their own licenses. Where applicable these licenses are include inside their respective SVG folder; I've aimed to include icons that don't put too much burden on the implementer, but open a pull request if something seems off.

In turn, if an icon author's license requires placing credit for the icons somewhere on your project, you are responsible for doing so. Icon creators work hard and that work isn't (totally) free.

Icon authors who take issue with their icons being in this project can feel free to email me directly at ryan@venodesigns.net.

Questions, Issues, Comments?
==============
You can reach me (the primary author) at the following:

- Twitter: **[@ryanmcgrath](https://twitter.com/ryanmcgrath/)**
- Email: ryan@venodesigns.net

I am unable to help specific implementation problems (specific to your project, that is) via email. If you do find a bug or experience something that seems like an issue with the project, please feel free to open an issue on the GitHub repository.
