'use strict';

var assert = require('assert');
var fs = require('fs');
var xmp = require('../src/xmp');

var xmpFile = 'test/images/1836 Map.jpg';
var noXmpFile = 'test/images/noXmp.jpg';

function _readFile (path, cb) {
    fs.readFile(path, function(err, data) {
        if (err) throw err;

        cb(data);
    });
}

describe('xmp.read(<buffer>)', function () {

    it('should return xmp when found', function (done) {
        _readFile(xmpFile, function(data) {
            xmp.read(data, function(err, xmpData) {
                assert(xmpData);
                done();
            });
            
        });
    });

    it('should specify an error in callback when no xmp is found', function (done) {
        _readFile(noXmpFile, function(data) {
            xmp.read(data, function(err, xmpData) {  
                assert(err);
                done();
            });
        });
    });
});