'use strict';

var assert = require('assert');
var AssetStore = require('../src/asset-store');
var supertest = require('supertest');
var port = 4001;
var request = supertest('localhost:' + port);

var uploadUrl = '/api/images';
var xmpFile = 'test/images/1836 Map.jpg';
var xmpNoViewFile = 'test/images/viewChicagoXmpNoImageDetails.jpg';
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
                this.request.attach('image', xmpFile)
                    .expect(401, done);
            });
        });        

        describe('image without xmp', function () {
            it('should respond with a 400', function (done) {
                this.request.field('token', session.id)
                    .attach('image', noXmpFile)
                    .expect(400, done);
            });
        });

        describe('image with xmp that contains ViewChicago:Image_Details tag', function () {
            it('should respond with 200, and json object of tags and url', function (done) {
                this.request.field('token', session.id)
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

        describe('image with xmp but missing ViewChicago:Image_Details', function () {
            it('should respond with a 400 and have an error message', function (done) {
                this.request.field('token', session.id)
                    .attach('image', xmpNoViewFile)
                    .expect(400)
                    .end(function(err, result) {
                        var body = result.body;
                        assert(result.type, 'application/json');
                        assert(body.error, 'no erro message in response');
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