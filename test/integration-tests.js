'use strict';

var assert = require('assert');
var AssetStore = require('../src/asset-store');

var config = require('../config');

var objectAssign = require('object-assign');

var supertest = require('supertest');
var port = 4001;
var request = supertest('localhost:' + port);

var mongoose = require('mongoose');
var SessionSchema = require('../src/schemas/session-schema');
var ImageMediaObjectSchema = require('../src/schemas/image-media-object-schema');
var VideoMediaObjectSchema = require('../src/schemas/video-media-object-schema');
var AudioMediaObjectSchema = require('../src/schemas/audio-media-object-schema');
var MediaSceneSchema = require('../src/schemas/media-scene-schema');

var db = mongoose.createConnection(config.mongoConnection);
var Session = db.model('Session', SessionSchema);
var ImageMediaObject = db.model('ImageMediaObject', ImageMediaObjectSchema);
var VideoMediaObject = db.model('VideoMediaObject', VideoMediaObjectSchema);
var AudioMediaObject = db.model('AudioMediaObject', AudioMediaObjectSchema);
var MediaScene = db.model('MediaScene', MediaSceneSchema, 'mediaScenes');

const ADMIN_UPLOAD_API = "/api/upload/media";

describe('AssetStore', function() {

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

    describe('POST to ' + ADMIN_UPLOAD_API, function() {
        beforeEach(function () {
            this.request = request.post(ADMIN_UPLOAD_API);
        });

        describe('without a token', function () {
            it('should respond with a 401', function (done) {
                var dublinCoreFile = 'test/images/1836 Map.jpg';
                this.request.attach('image', dublinCoreFile)
                    .expect(401, done);
            });
        });

        describe('media without mediaType specified', function() {
            it('should respond with a 400', function (done) {
                var noXmpFile = 'test/images/noXmp.jpg';
                this.request.field('token', session.id)
                    .attach('image', noXmpFile)
                    .expect(400, done);
            });
        });

        describe('media without filename specified', function() {
            it('should respond with a 400', function (done) {
                var noXmpFile = 'test/images/noXmp.jpg';
                this.request.field('token', session.id)
                    .field('mediaType', 'image')
                    .attach('image', noXmpFile)
                    .expect(400, done);
            });
        });

        describe('image without xmp', function () {
            it('should respond with 200 and a url', function (done) {
                var noXmpFile = 'test/images/noXmp.jpg';
                this.request.field('token', session.id)
                    .field('mediaType', 'image')
                    .field('filename', 'noXmp.jpg')
                    .attach('image', noXmpFile)
                    .end(function(err, result) {
                        assert.equal(result.status, 200);
                        var body = result.body;
                        assert(result.type, 'application/json');
                        assert(!body.tags, 'tags in response');
                        assert(body.url, 'no url in response');
                        done();
                    });
            });
        });

    });
});