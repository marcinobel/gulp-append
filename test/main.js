/*global describe, it*/
'use strict';

require('mocha');

var fs = require('fs'),
    path = require('path'),
    es = require('event-stream'),
    should = require('should'),
    gutil = require('gulp-util'),
    append = require('../');

function contentOf(file) {
    return String(fs.readFileSync(path.join(__dirname, 'expected', file)));
}

function load() {
    var read = false,
        files = [],
        i = 0,
        filepath, file;

    if (typeof arguments[0] !== 'string') {
        i = 1;
        read = Boolean(arguments[0]);
    }

    for (; i < arguments.length; i++) {
        filepath = path.join(__dirname, 'fixtures', arguments[i]);
        file = new gutil.File({
            path: filepath,
            cwd: __dirname,
            base: path.join(__dirname, 'fixtures', path.dirname(arguments[i])),
            contents: read ? fs.readFileSync(filepath) : null
        });
        files.push(file);
    }
    return files;
}

function invokePlugin(done, fileOrStream, opt) {
    if (!done || typeof done !== 'function') {
        throw new Error('"done" not included');
    }
    return append(fileOrStream, opt)
        .on('error', function (err) {
            should.exist(err);
            done(err);
        });
}

describe('Gulp plugin', function () {

    it('should append stylesheets, scripts and html components into desired file', function (done) {

        var sources = load('lib.js', 'component.html', 'styles.css');

        var stream = invokePlugin(done, 'fixtures/template-1.html')
            .on('data', function (file) {
                file.base.should.equal(path.join(__dirname, 'fixtures'));
                String(file.contents).should.equal(contentOf('defaults.html'));
                done();
            });

        sources.forEach(function (src) {
            stream.write(src);
        });

        stream.end();
    });

    it('should take a Vinyl File Stream with files to append into current stream', function (done) {

        var templates = es.readArray(load(true, 'template-1.html', 'template-2.html'));
        templates.pause();
        var sources = es.readArray(load('lib.js', 'component.html', 'styles.css'));
        sources.pause();

        var stream = templates.pipe(invokePlugin(done, sources));

        var received = 0;
        stream.on('data', function (file) {
            String(file.contents).should.equal(contentOf(received ? 'defaults2.html' : 'defaults.html'));
            received++;
            if (received === 2) {
                done();
            }
        });

        templates.resume();
        sources.resume();
    });

    it('should append stylesheets, scripts and html components with `ignorePath` removed from file path', function (done) {

        var sources = load('lib.js', 'component.html', 'lib2.js', 'styles.css');

        var stream = invokePlugin(done, 'fixtures/template-1.html', { ignorePath: '/fixtures' })
            .on('data', function (file) {
                String(file.contents).should.equal(contentOf('ignorePath.html'));
                done();
            });

        sources.forEach(function (src) {
            stream.write(src);
        });

        stream.end();
    });

    it('should append stylesheets, scripts and html components with `addPrefix` added to file path', function (done) {

        var sources = load('lib.js', 'component.html', 'lib2.js', 'styles.css');

        var stream = invokePlugin(done, 'fixtures/template-1.html', { addPrefix: 'my-test-dir' })
            .on('data', function (file) {
                String(file.contents).should.equal(contentOf('addPrefix.html'));
                done();
            });

        sources.forEach(function (src) {
            stream.write(src);
        });

        stream.end();
    });

    it('should append stylesheets, scripts and html components without root slash if `addRootSlash` is `false`', function (done) {

        var sources = load('lib.js', 'component.html', 'styles.css');

        var stream = invokePlugin(done, 'fixtures/template-1.html', { addRootSlash: false })
            .on('data', function (file) {
                String(file.contents).should.equal(contentOf('noRootSlash.html'));
                done();
            });

        sources.forEach(function (src) {
            stream.write(src);
        });

        stream.end();
    });

    it('should use templateString as template if specified', function (done) {

        var sources = load('lib.js', 'component.html', 'lib2.js', 'styles.css');

        var stream = invokePlugin(done, 'fixtures/templateString.html', {
            ignorePath: 'fixtures',
            templateString: '<!DOCTYPE html><!-- inject:js --><!-- endinject --><h1>Hello world</h1>'
        }).on('data', function (file) {
            String(file.contents).should.equal(contentOf('templateString.html'));
            done();
        });

        sources.forEach(function (src) {
            stream.write(src);
        });

        stream.end();
    });

    it('should use starttag and endtag if specified', function (done) {

        var sources = load('lib.js', 'lib2.js');

        var stream = invokePlugin(done, 'fixtures/templateString.html', {
            ignorePath: 'fixtures',
            starttag: '<!DOCTYPE html>',
            endtag: '<h1>',
            templateString: '<!DOCTYPE html><h1>Hello world</h1>'
        }).on('data', function (file) {
            String(file.contents).should.equal(contentOf('templateStringCustomTags.html'));
            done();
        });

        sources.forEach(function (src) {
            stream.write(src);
        });

        stream.end();
    });

    it('should replace {{ext}} in starttag and endtag with current file extension if specified', function (done) {

        var sources = load('lib.js', 'component.html', 'lib2.js');

        var stream = invokePlugin(done, 'fixtures/templateString.html', {
            ignorePath: 'fixtures',
            starttag: '<!-- {{ext}}: -->',
            endtag: '<!-- /{{ext}} -->',
            templateString: '<!DOCTYPE html><!-- js: --><!-- /js --><h1>Hello world</h1>'
        }).on('data', function (test) {
            String(test.contents).should.equal(contentOf('templateStringCustomTagsWithExt.html'));
            done();
        });

        sources.forEach(function (src) {
            stream.write(src);
        });

        stream.end();
    });

    it('should replace existing data within start and end tag', function (done) {

        var sources = load('lib.js', 'component.html', 'lib2.js', 'styles.css');

        var stream = invokePlugin(done, 'fixtures/templateString.html', {
            replace: true,
            ignorePath: 'fixtures',
            templateString: '<!DOCTYPE html><!-- inject:js --><script src="/aLib.js"></script><!-- endinject --><h1>Hello world</h1>'
        }).on('data', function (file) {
            String(file.contents).should.equal(contentOf('templateStringWithExisting.html'));
            done();
        });

        sources.forEach(function (src) {
            stream.write(src);
        });

        stream.end();
    });

    it('should use custom transform function for each file if specified', function (done) {

        var sources = load('lib.js', 'component.html', 'lib2.js', 'styles.css');

        var stream = invokePlugin(done, 'fixtures/customTransform.json', {
            ignorePath: 'fixtures',
            templateString: '{\n  "js": [\n  ]\n}',
            starttag: '"{{ext}}": [',
            endtag: ']',
            transform: function (srcPath, file, i, length) {
                return '  "' + srcPath + '"' + (i + 1 < length ? ',' : '');
            }
        }).on('data', function (file) {
            String(file.contents).should.equal(contentOf('customTransform.json'));
            done();
        });

        sources.forEach(function (src) {
            stream.write(src);
        });

        stream.end();
    });

    it('should use custom adjust function for old content found between start and end tag', function(done) {
        var sources = load('lib2.js', 'lib3.js', 'component2.html');

        var stream = invokePlugin(done, 'fixtures/template-5.html', {
            adjust: function (key, content) {
                if (key !== '<!-- inject:js -->') {
                    return content;
                }
                return '<!-- ' + content + ' -->';
            }
        }).on('data', function (file) {
            String(file.contents).should.equal(contentOf('adjust.html'));
            done();
        });

        sources.forEach(function (src) {
            stream.write(src);
        });

        stream.end();
    });

    it('should inject files ordered with a custom sorting function if specified', function (done) {

        var sources = load('lib.js', 'lib2.js');

        var stream = invokePlugin(done, 'fixtures/template-1.html', {
            ignorePath: 'fixtures',
            sort: function (a, b) {
                return b.filepath.localeCompare(a.filepath);
            }
        }).on('data', function (file) {
            String(file.contents).should.equal(contentOf('customSort.html'));
            done();
        });

        sources.forEach(function (src) {
            stream.write(src);
        });

        stream.end();
    });

    it('should append new data before end tag', function (done) {

        var sources = load('source2.js', 'source2.html', 'source2.css');

        var stream = invokePlugin(done, 'fixtures/template-3.html')
            .on('data', function (file) {
                String(file.contents).should.equal(contentOf('append.html'));
                done();
            });

        sources.forEach(function (src) {
            stream.write(src);
        });

        stream.end();
    });

    it('should be able to append new data using transform function for each file', function (done) {

        var sources = load('lib2.js', 'component.html', 'lib3.js', 'styles.css');

        var stream = invokePlugin(done, 'fixtures/customTransform.json', {
            ignorePath: 'fixtures',
            templateString: '{\n  "js": [\n    "/lib1.js"\n  ]\n}',
            starttag: '"{{ext}}": [',
            endtag: ']',
            transform: function (srcPath, file, i, length) {
                return '  "' + srcPath + '"' + (i + 1 < length ? ',' : '');
            },
            adjust: function (key, content) {
                return '  ' + content + ',';
            }
        }).on('data', function (file) {
            String(file.contents).should.equal(contentOf('append.json'));
            done();
        });

        sources.forEach(function (src) {
            stream.write(src);
        });

        stream.end();
    });

    it('should be able to append files to an empty sections', function (done) {

        var sources = load('lib.js', 'component.html', 'lib2.js', 'styles.css');

        var stream = invokePlugin(done, 'fixtures/template-1.html', {
            ignorePath: '/fixtures',
            replace: true
        }).on('data', function (file) {
            String(file.contents).should.equal(contentOf('ignorePath.html'));
            done();
        });

        sources.forEach(function (src) {
            stream.write(src);
        });

        stream.end();
    });

    it('should use indent of starttag', function (done) {
        var sources = load('lib1.js', 'lib2.js', 'lib3.js');

        var stream = invokePlugin(done, 'fixtures/template-4.html')
            .on('data', function (file) {
                String(file.contents).should.equal(contentOf('indentOfStartTag.html'));
                done();
            });

        sources.forEach(function (src) {
            stream.write(src);
        });

        stream.end();
    });
});
