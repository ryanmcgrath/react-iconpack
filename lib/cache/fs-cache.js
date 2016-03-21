'use strict';

/**
 * Filesystem cache
 *
 * Given a file and a transform function, cache the result into files
 * or retrieve the previously cached files if the given file is already known.
 *
 * Note: This is shamelessly lifted and modified from babel-loader's cache. See
 * https://github.com/babel/babel-loader/blob/master/lib/fs-cache.js
 * -- Ryan McGrath, who'd rather not reinvent the wheel
 *
 * @see https://github.com/babel/babel-loader/issues/34
 * @see https://github.com/babel/babel-loader/pull/41
 */
var crypto = require('crypto');
var mkdirp = require('mkdirp');
var fs = require('fs');
var os = require('os');
var path = require('path');
var zlib = require('zlib');

/**
 * Read the contents from the compressed file.
 *
 * @async
 * @params {String} filename
 * @params {Function} callback
 */
var read = function(filename, callback) {
    return fs.readFile(filename, function(err, data) {
        if(err)
            return callback(err);

        return zlib.gunzip(data, function(err, content) {
            var result = {};

            if(err)
                return callback(err);

            try {
                result = JSON.parse(content);
            } catch (e) {
                return callback(e);
            }

            return callback(null, result);
        });
    });
};


/**
 * Write contents into a compressed file.
 *
 * @async
 * @params {String} filename
 * @params {String} result
 * @params {Function} callback
 */
var write = function(filename, result, callback) {
    var content = JSON.stringify(result);

    return zlib.gzip(content, function(err, data) {
        if(err)
            return callback(err);
        return fs.writeFile(filename, data, callback);
    });
};


/**
 * Build the filename for the cached file
 *
 * @params {String} source  File source code
 * @params {Object} options Options used
 *
 * @return {String}
 */
var filename = function(source, identifier, options) {
    var hash = crypto.createHash('SHA1');
    var contents = JSON.stringify({
        source: source,
        identifier: identifier,
    });

    hash.end(contents);
    return hash.read().toString('hex') + '.json.gzip';
};

/**
 * Retrieve file from cache, or create a new one for future reads
 *
 * @async
 * @param  {Object}   params
 * @param  {String}   params.identifier Unique identifier to bust cache
 * @param  {String}   params.source   Original contents of the file to be cached
 * @param  {Function<err, result>} callback
 *
 * @example
 *
 *   cache({
 *     identifier: '',
 *     source: *source code from file*,
 *   }, function(err, result) {
 *
 *   });
 */
var cache = module.exports = function(params, callback) {
    // Spread params into named variables
    // Forgive user whenever possible
    var source = params.source;
    var identifier = params.identifier;
    var directory = os.tmpdir();
    var file = path.join(directory, filename(source, identifier));

    // Make sure the directory exists.
    return mkdirp(directory, function(err) {
        if(err)
            return callback(err);

        return read(file, function(err, content) {
            var result = {};

            // No errors mean that the file was previously cached
            // we just need to return it
            if(!err) 
                return callback(null, content);

            // return it to the user asap and write it in cache
            return write(file, result, function(err) {
                return callback(err, result);
            });
        });
    });
};
