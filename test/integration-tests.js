'use strict';

var assert = require('assert');
var assetStore = require('../src/asset-store');
var supertest = require('supertest');
var port = 3001;
var request = supertest('localhost:' + port);

describe('AssetStore', function () {
     var store;

     beforeEach(function (done) {
         store = assetStore({
            port: port,
            uploadDir: './uploads/'
        });
         store.listen(function(err, result) {
            if (err) {
                done(err);
            } else {
                done();
            }
         });
     });

     describe('Upload an image', function () {
         it('should respond with a 200', function (done) {
             request.post('/upload/image')
                .attach('image', 'test/banana.jpg')
                .end(function(err, res) {
                    assert.equal(res.status, 200);
                    done();
                }); 
         });
     });
});