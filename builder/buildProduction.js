#!/usr/bin/env node
/*global require, console, process, __dirname*/

var fs = require('fs'),
    path = require('path'),
    argv = require('optimist').argv,
    uglifyJS = require('uglify-js'),
    uglifyCSS = require('uglifycss'),
    basedir = path.resolve(__dirname, '..'),
    homedir = argv.homedir ? argv.homedir : null;

if (homedir) {
    homedir = homedir.indexOf('http') === 0 ? argv.homedir : 'http://' + argv.homedir; // prefix 'http://' if lacking
    homedir = homedir.lastIndexOf('/') === homedir.length-1 ? homedir.substr(0, homedir.length - 1) : homedir;  // remove last '/' if present
}

function processFile(config, cb) {
    console.log('Processing file: ' + config.source);
    var source = path.resolve(basedir, 'http-pub') + path.resolve('/', config.source),
        destination = path.resolve(basedir, 'production') + path.resolve('/', config.destination);

    fs.readFile(source, {
            encoding: 'utf-8'
        },
        function (err, data) {
            if (err) {
                console.log('ERROR: Could not open file ' + source + '. ' + err.message);
                process.exit(1);
            }

            if (config.replaceHomedir && homedir) {
                data = data.replace(/http:\/\/localhost:8002/, homedir); // This might be slow, but it works, and it is only once per link under deployment it is happening!
            }

            if (config.fnProcessData) {
                data = config.fnProcessData(data);
            }

            fs.writeFile(destination, data, { encoding: 'utf-8' }, function (err) {
                if (err) {
                    console.log(err);
                    process.exit(1);
                } else {
                    if (cb) {
                        cb();
                    }
                }
            });
        }
    );
}

function getMinifiedFileName(filename) {
    return path.basename(filename, path.extname(filename)) + '_min' + path.extname(filename);
}

// --- Compress and move files for production ---
console.log('working...');

// minify openingHours
processFile({
    source : 'openingHours.js',
    destination : getMinifiedFileName('openingHours.js'),
    fnProcessData : function (data) {
        //use minified css
        data = data.replace(/openingHoursStyles\.css/,'openingHoursStyles_min.css');

        var ast = uglifyJS.parse(data),
            compressor = uglifyJS.Compressor();

        ast.figure_out_scope();
        ast = ast.transform(compressor);
        ast.figure_out_scope();
        ast.compute_char_frequency();
        ast.mangle_names();

        return ast.print_to_string();
    },
    replaceHomedir : true
}, function () {
    console.log('openingHours.js done.');
});

// minify openingHoursStyles.css
processFile({
    source : 'openingHoursStyles.css',
    destination : getMinifiedFileName('openingHoursStyles.css'),
    fnProcessData : uglifyCSS.processString
}, function () {
    console.log('openingHoursStyles.css done.');
});

// move index.html
processFile({
    source : 'index.html',
    destination : 'index.html',
    fnProcessData : function (data) {
        return data.replace(/openingHours\.js/,'openingHours_min.js');
    },
    replaceHomedir : true
}, function () {
    console.log('index.html done.');
});
