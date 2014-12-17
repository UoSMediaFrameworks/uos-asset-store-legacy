'use strict';

var assert = require('assert');
var assetStore = require('../src/asset-store');
var supertest = require('supertest');
var port = 4001;
var request = supertest('localhost:' + port);
var session = require('../src/session');

var uploadUrl = '/upload/image';
var xmpFile = 'test/images/viewChicagoXmp.jpg';
var noXmpFile = 'test/images/noXmp.jpg';
var config = require('../config');
var objectAssign = require('object-assign');

describe('AssetStore', function () { 
    var store;
    var sessionId;

    before(function (done) {
        store = assetStore(objectAssign(config, {port: port}), function(err) {
            store.listen(function(err, result) {
                if (err) {
                    done(err);
                } else {
                    session.create(function(err, record) {
                        if (err) {
                            done(err);
                        } else {
                            sessionId = record._id.toString();
                            done();    
                        }
                    });
                }
            });    
        });
        
    }); 

    after(function (done) {
        store.close(done);
    });

    describe('POST to ' + uploadUrl, function () {
        beforeEach(function () {
            this.request = request.post(uploadUrl);
        });


        describe('without a token', function () {
            it('should respond with a 401', function (done) {
                this.request.attach('image', xmpFile)
                    .expect(401, done);
            });
        });        

        describe('image without xmp', function () {
            it('should respond with a 400', function (done) {
                this.request.field('token', sessionId)
                    .attach('image', noXmpFile)
                    .expect(400, done);
            });
        });

        describe('image with xmp', function () {
            it('should respond with 200, and json object of tags and url', function (done) {
                this.request.field('token', sessionId)
                    .attach('image', xmpFile)
                    .expect(200)
                    .end(function(err, result) {
                        var body = result.body;
                        assert(result.type, 'application/json');
                        assert(body.tags, 'no tags in response');
                        assert(body.url, 'no url in response');
                        done();
                    });
            });
        });

        describe('no image', function () {
            it('should respond with a 400', function (done) {
                this.request.send('token=' + sessionId)
                    .end(function(err, res) {
                        assert.equal(res.status, 400);
                        done();
                    });
            });
        });
    });

    
}); 