'use strict';

var assert = require('assert');
var AssetStore = require('../src/asset-store');
var supertest = require('supertest');
var port = 4001;
var request = supertest('localhost:' + port);

var uploadUrl = '/api/images';
var dublinCoreFile = 'test/images/1836 Map.jpg';
var viewChicagoFile = 'test/images/viewChicagoTagged.jpg';
var xmpNoViewFile = 'test/images/noDublinCoreKeywords.jpg';
var noXmpFile = 'test/images/noXmp.jpg';
var config = require('../config');
var objectAssign = require('object-assign');
var mongoose = require('mongoose');
var SessionSchema = require('../src/schemas/session-schema');

var db = mongoose.createConnection(config.mongoConnection); 
var Session = db.model('Session', SessionSchema);

describe('AssetStore', function () { 
    var store;
    var session;

    before(function (done) {
        store = new AssetStore(objectAssign(config, {port: port}));
        store.listen(function(err, result) {
            if (err) {
                done(err);  
            } else {
                // make a session to use for tests
                session = new Session();
                session.save(function(error) {
                    done(error); 
                });    
            }
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
                this.request.attach('image', dublinCoreFile)
                    .expect(401, done);
            });
        });        

        describe('image without xmp', function () {
            it('should respond with 200 and a url', function (done) {
                this.request.field('token', session.id)
                    .attach('image', noXmpFile)
                    .end(function(err, result) {
                        assert.equal(result.status, 200);
                        var body = result.body;
                        assert(result.type, 'application/json');
                        assert(! body.tags, 'tags in response');
                        assert(body.url, 'no url in response');
                        done();
                    });
            });
        });

        describe('image with xmp that contains Dublin Core keywords', function () {
            it('should respond with 200, and json object of tags and url', function (done) {
                this.request.field('token', session.id)
                    .attach('image', dublinCoreFile)
                    .end(function(err, result) {
                        assert.equal(result.status, 200);
                        var body = result.body;
                        assert(result.type, 'application/json');
                        assert(body.tags, 'no tags in response');
                        assert(body.url, 'no url in response');
                        done();
                    });
            });
        });

        describe('image with xmp that contains View Chicago tags', function () {
            it('should respond with 200, and json object of tags and url', function (done) {
                this.request.field('token', session.id)
                    .attach('image', viewChicagoFile)
                    .end(function(err, result) {
                        assert.equal(result.status, 200);
                        var body = result.body;
                        assert(result.type, 'application/json');
                        assert(body.tags, 'no tags in response');
                        assert(body.url, 'no url in response');
                        done();
                    });
            });
        });

        describe('image with xmp but missing Dublin Core keywords and View Chicago tags', function () {
            it('should respond with 200 and a url', function (done) {
                this.request.field('token', session.id)
                    .attach('image', xmpNoViewFile)
                    .end(function(err, result) {
                        assert.equal(result.status, 200);
                        var body = result.body;
                        assert(result.type, 'application/json');
                        assert(body.url, 'no url in response');
                        assert(! body.tags, 'tags in response');
                        done();
                    });
            });
        });

        describe('no image', function () {
            it('should respond with a 400', function (done) {
                this.request.send('token=' + session.id)
                    .end(function(err, res) {
                        assert.equal(res.status, 400);
                        done();
                    });
            });
        });
    });

    
}); 