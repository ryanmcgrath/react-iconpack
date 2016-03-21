var IconPacker = require('react-iconpack')('webpack'),
    path = require('path'),
    PATHS = {
        src: path.join(__dirname + '/webpack-test/src'),
        dist: path.join(__dirname + '/webpack-test/dist'),
    };


module.exports = {
    cache: true,
    entry: [path.join(PATHS.src, '/app.js')],

    resolve: {
        extensions: ['', '.js', '.jsx']
    },

    output: {
        path: PATHS.dist,
        filename: 'build.js'
    },

    module: {
        loaders: [{
            test: /\.jsx?$/,
            loader: 'babel',
            exclude: /node_modules/,
            include: PATHS.src,
            query: {
                //cacheDirectory: true,
                presets: ['es2015', 'react'],
                plugins: ['react-iconpack']
            }
        }]
    },

    plugins: [IconPacker({})]
};
