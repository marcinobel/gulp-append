/*global describe, it*/
'use strict';

require('mocha');

var fs = require('fs'),
    path = require('path'),
    should = require('should'),
    append = require('../');

function contentOf(file) {
    return String(fs.readFileSync(path.join(__dirname, 'fixtures', file)));
}

function exec(file, starttag, endtag, callback) {
    var regex = append.createSectionMatcher(starttag, endtag);
    var matches = regex.exec(contentOf(file));
    callback(matches[0], matches[1], matches[2], matches[3], matches[4])
}

describe('RegExp created by createSectionMatcher', function () {

    it('should match single line section with start tag being first element in a line', function () {
        exec('template-regex.html', '<!-- inject1 -->', '<!-- endinject -->',
            function (match, before, starttag, content, endtag) {
                before.should.equal('');
                starttag.should.equal('<!-- inject1 -->');
                content.should.equal('');
                endtag.should.equal('<!-- endinject -->');
            })
    });

    it('should match single line section with start tag following white spaces', function () {
        exec('template-regex.html', '<!-- inject2 -->', '<!-- endinject -->',
            function (match, before, starttag, content, endtag) {
                before.should.equal('    ');
                starttag.should.equal('<!-- inject2 -->');
                content.should.equal('');
                endtag.should.equal('<!-- endinject -->');
            })
    });

    it('should match single line section with start tag following some other text', function () {
        exec('template-regex.html', '<!-- inject3 -->', '<!-- endinject -->',
            function (match, before, starttag, content, endtag) {
                before.should.equal('    <meta charset="UTF-8"/>  ');
                starttag.should.equal('<!-- inject3 -->');
                content.should.equal('');
                endtag.should.equal('<!-- endinject -->');
            })
    });

    it('should match multiline section with start tag begin first element in a line', function () {
        exec('template-regex.html', '<!-- inject4 -->', '<!-- endinject -->',
            function (match, before, starttag, content, endtag) {
                before.should.equal('');
                starttag.should.equal('<!-- inject4 -->');
                content.should.equal('\n');
                endtag.should.equal('<!-- endinject -->');
            })
    });

    it('should match multiline section with start tag following white spaces', function () {
        exec('template-regex.html', '<!-- inject5 -->', '<!-- endinject -->',
            function (match, before, starttag, content, endtag) {
                before.should.equal('    ');
                starttag.should.equal('<!-- inject5 -->');
                content.should.equal('\n    ');
                endtag.should.equal('<!-- endinject -->');
            })
    });

    it('should match multiline section with start tag following some other text', function () {
        exec('template-regex.html', '<!-- inject6 -->', '<!-- endinject -->',
            function (match, before, starttag, content, endtag) {
                before.should.equal('    <h1>gulp-append</h1>    ');
                starttag.should.equal('<!-- inject6 -->');
                content.should.equal('\n                            ');
                endtag.should.equal('<!-- endinject -->');
            })
    });
});
