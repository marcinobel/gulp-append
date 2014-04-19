/*global describe, it*/
'use strict';

require('mocha');

var fs = require('fs');
var path = require('path');
var es = require('event-stream');
var should = require('should');
var gutil = require('gulp-util');
var append = require('../');

function file(file) {
    var filepath = path.join(__dirname, 'expected', file);
    var file = new gutil.File({
        path: filepath,
        cwd: __dirname,
        base: path.join(__dirname, 'expected', path.dirname(file)),
        contents: fs.readFileSync(filepath)
    });
    return String(file.contents);
}

function fixture(file, read) {
    var filepath = path.join(__dirname, 'fixtures', file);
    return new gutil.File({
        path: filepath,
        cwd: __dirname,
        base: path.join(__dirname, 'fixtures', path.dirname(file)),
        contents: read ? fs.readFileSync(filepath) : null
    });
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

describe('gulp-append', function () {

    it('should inject stylesheets, scripts and html components into desired file', function (done) {

        var sources = [
            fixture('lib.js'),
            fixture('component.html'),
            fixture('styles.css')
        ];

        var stream = invokePlugin(done, 'fixtures/template.html')
          .on('data', function (newFile) {
              should.exist(newFile);
              should.exist(newFile.contents);
              newFile.base.should.equal(path.join(__dirname, 'fixtures'));
              String(newFile.contents).should.equal(file('defaults.html'));
              done();
          });

        sources.forEach(function (src) {
            stream.write(src);
        });

        stream.end();
    });

    it('should take a Vinyl File Stream with files to inject into current stream', function (done) {

        var source = es.readArray([
            fixture('template.html', true),
            fixture('template2.html', true)
        ]);
        source.pause();
        var toInject = es.readArray([
            fixture('lib.js'),
            fixture('component.html'),
            fixture('styles.css')
        ]);
        toInject.pause();

        var stream = source.pipe(append(toInject));

        stream.on('error', function (err) {
            should.exist(err);
            done(err);
        });

        var received = 0;
        stream.on('data', function (newFile) {
            should.exist(newFile);
            should.exist(newFile.contents);

            String(newFile.contents).should.equal(file(received ? 'defaults2.html' : 'defaults.html'));

            if (++received === 2) {
                done();
            }
        });

        source.resume();

        toInject.resume();
    });

    it('should inject stylesheets, scripts and html components with `ignorePath` removed from file path', function (done) {

        var sources = [
            fixture('lib.js'),
            fixture('component.html'),
            fixture('lib2.js'),
            fixture('styles.css')
        ];

        var stream = invokePlugin(done, 'fixtures/template.html', {ignorePath: '/fixtures'})
          .on('data', function (newFile) {
              should.exist(newFile);
              should.exist(newFile.contents);
              String(newFile.contents).should.equal(file('ignorePath.html'));
              done();
          });

        sources.forEach(function (src) {
            stream.write(src);
        });

        stream.end();
    });

    it('should inject stylesheets, scripts and html components with `addPrefix` added to file path', function (done) {

        var sources = [
            fixture('lib.js'),
            fixture('component.html'),
            fixture('lib2.js'),
            fixture('styles.css')
        ];

        var stream = invokePlugin(done, 'fixtures/template.html', { addPrefix: 'my-test-dir' })
          .on('data', function (newFile) {
              should.exist(newFile);
              should.exist(newFile.contents);
              String(newFile.contents).should.equal(file('addPrefix.html'));
              done();
          });

        sources.forEach(function (src) {
            stream.write(src);
        });

        stream.end();
    });

    it('should inject stylesheets, scripts and html components without root slash if `addRootSlash` is `false`', function (done) {

        var sources = [
            fixture('lib.js'),
            fixture('component.html'),
            fixture('styles.css')
        ];

        var stream = invokePlugin(done, 'fixtures/template.html', {addRootSlash: false})
          .on('data', function (newFile) {
              should.exist(newFile);
              should.exist(newFile.contents);
              String(newFile.contents).should.equal(file('noRootSlash.html'));
              done();
          });

        sources.forEach(function (src) {
            stream.write(src);
        });

        stream.end();
    });

    it('should use templateString as template if specified', function (done) {

        var sources = [
            fixture('lib.js'),
            fixture('component.html'),
            fixture('lib2.js'),
            fixture('styles.css')
        ];

        var stream = invokePlugin(done, 'fixtures/templateString.html', {
            ignorePath: 'fixtures',
            templateString: '<!DOCTYPE html>\n<!-- inject:js -->\n<!-- endinject -->\n<h1>Hello world</h1>'
        }).on('data', function (newFile) {
            should.exist(newFile);
            should.exist(newFile.contents);
            String(newFile.contents).should.equal(file('templateString.html'));
            done();
        });

        sources.forEach(function (src) {
            stream.write(src);
        });

        stream.end();
    });

    it('should use starttag and endtag if specified', function (done) {

        var sources = [
            fixture('lib.js'),
            fixture('lib2.js')
        ];

        var stream = invokePlugin(done, 'fixtures/templateString.html', {
            ignorePath: 'fixtures',
            starttag: '<!DOCTYPE html>',
            endtag: '<h1>',
            templateString: '<!DOCTYPE html><h1>Hello world</h1>'
        }).on('data', function (newFile) {
            should.exist(newFile);
            should.exist(newFile.contents);
            String(newFile.contents).should.equal(file('templateStringCustomTags.html'));
            done();
        });

        sources.forEach(function (src) {
            stream.write(src);
        });

        stream.end();
    });

    it('should replace {{ext}} in starttag and endtag with current file extension if specified', function (done) {

        var sources = [
            fixture('lib.js'),
            fixture('component.html'),
            fixture('lib2.js')
        ];

        var stream = invokePlugin(done, 'fixtures/templateString.html', {
            ignorePath: 'fixtures',
            starttag: '<!-- {{ext}}: -->',
            endtag: '<!-- /{{ext}} -->',
            templateString: '<!DOCTYPE html>\n<!-- js: -->\n<!-- /js -->\n<h1>Hello world</h1>'
        }).on('data', function (newFile) {
            should.exist(newFile);
            should.exist(newFile.contents);
            String(newFile.contents).should.equal(file('templateStringCustomTagsWithExt.html'));
            done();
        });

        sources.forEach(function (src) {
            stream.write(src);
        });

        stream.end();
    });

    it('should replace existing data within start and end tag', function (done) {

        var sources = [
            fixture('lib.js'),
            fixture('component.html'),
            fixture('lib2.js'),
            fixture('styles.css')
        ];

        var stream = invokePlugin(done, 'fixtures/templateString.html', {
            ignorePath: 'fixtures',
            templateString: '<!DOCTYPE html>\n<!-- inject:js -->\n<script src="/aLib.js"></script>\n<!-- endinject -->\n<h1>Hello world</h1>'
        }).on('data', function (newFile) {
            should.exist(newFile);
            should.exist(newFile.contents);
            String(newFile.contents).should.equal(file('templateStringWithExisting.html'));
            done();
        });

        sources.forEach(function (src) {
            stream.write(src);
        });

        stream.end();
    });

    it('should use custom transform function for each file if specified', function (done) {

        var sources = [
            fixture('lib.js'),
            fixture('component.html'),
            fixture('lib2.js'),
            fixture('styles.css')
        ];

        var stream = append('fixtures/customTransform.json', {
            ignorePath: 'fixtures',
            templateString: '{\n  "js": [\n  ]\n}',
            starttag: '"{{ext}}": [',
            endtag: ']',
            transform: function (srcPath, file, i, length) {
                return '  "' + srcPath + '"' + (i + 1 < length ? ',' : '');
            }
        }).on('data', function (newFile) {
            should.exist(newFile);
            should.exist(newFile.contents);
            String(newFile.contents).should.equal(file('customTransform.json'));
            done();
        });

        sources.forEach(function (src) {
            stream.write(src);
        });

        stream.end();
    });

    it('should inject files ordered with a custom sorting function if specified', function (done) {

        var sources = [
            fixture('lib.js'),
            fixture('lib2.js')
        ];

        var stream = append('fixtures/template.html', {
            ignorePath: 'fixtures',
            sort: function (a, b) {
                return b.filepath.localeCompare(a.filepath);
            }
        }).on('data', function (newFile) {
            should.exist(newFile);
            should.exist(newFile.contents);
            String(newFile.contents).should.equal(file('customSort.html'));
            done();
        });

        sources.forEach(function (src) {
            stream.write(src);
        });

        stream.end();
    });

    it('should append new data before end tag', function (done) {

        var sources = [
            fixture('source2.js'),
            fixture('source2.html'),
            fixture('source2.css')
        ];

        var stream = invokePlugin(done, 'fixtures/template3.html', {
            append: true
        }).on('data', function (newFile) {
            should.exist(newFile);
            should.exist(newFile.contents);
            String(newFile.contents).should.equal(file('append.html'));
            done();
        });

        sources.forEach(function (src) {
            stream.write(src);
        });

        stream.end();
    });

    it('should be able to append new data using transform function for each file', function (done) {

        var sources = [
            fixture('lib2.js'),
            fixture('component.html'),
            fixture('lib3.js'),
            fixture('styles.css')
        ];

        var stream = invokePlugin(done, 'fixtures/customTransform.json', {
            ignorePath: 'fixtures',
            templateString: '{\n  "js": [\n    "/lib1.js"\n  ]\n}',
            starttag: '"{{ext}}": [',
            append: true,
            endtag: ']',
            transform: function (srcPath, file, i, length) {
                return '  "' + srcPath + '"' + (i + 1 < length ? ',' : '');
            },
            adjust: function (key, content) {
                return '  ' + content + ',';
            }
        }).on('data', function (newFile) {
            should.exist(newFile);
            should.exist(newFile.contents);
            String(newFile.contents).should.equal(file('append.json'));
            done();
        });

        sources.forEach(function (src) {
            stream.write(src);
        });

        stream.end();
    });

    it('should be able to append files to an empty sections', function (done) {

        var sources = [
            fixture('lib.js'),
            fixture('component.html'),
            fixture('lib2.js'),
            fixture('styles.css')
        ];

        var stream = invokePlugin(done, 'fixtures/template.html', {ignorePath: '/fixtures', append: true})
          .on('data', function (newFile) {
              should.exist(newFile);
              should.exist(newFile.contents);
              String(newFile.contents).should.equal(file('ignorePath.html'));
              done();
          });

        sources.forEach(function (src) {
            stream.write(src);
        });

        stream.end();
    });
});
