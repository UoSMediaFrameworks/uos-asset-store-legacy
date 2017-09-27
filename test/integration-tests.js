'use strict';

var assert = require('assert');
var AssetStore = require('../src/asset-store');

var config = require('../config');

var objectAssign = require('object-assign');
var async = require('async');
var _ = require('lodash');

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
const ADMIN_CONVERT_ASSET_API = "/api/upload/convert";

var mediaSceneWithSoundcloudMedia = {
    "name": "Test01",
    "version": "0.1",
    "_groupID": 0,
    "maximumOnScreen": {
        "image": 3,
        "text": 1,
        "video": 1,
        "audio": 1
    },
    "displayDuration": 10,
    "displayInterval": 3,
    "transitionDuration": 1.4,
    "themes": {},
    "style": {
        "backgroundColor": "black"
    },
    "scene": [
        {
            "tags": "",
            "type": "audio",
            "volume": 100,
            "url": "https://soundcloud.com/user-297728422/iybxju5ubzqh",
            "_id": "57988be8ec1e72d8833fe8f5"
        },
        {
            "tags": "",
            "type": "audio",
            "volume": 100,
            "url": "https://soundcloud.com/user-297728422/new-for-test-old",
            "_id": "57988be8ec1e72d8833fe8f5"
        }
    ],
};

var mediaSceneWithSoundcloudMediaAndOthers = {
    "name": "Test02",
    "version": "0.1",
    "_groupID": 0,
    "maximumOnScreen": {
        "image": 3,
        "text": 1,
        "video": 1,
        "audio": 1
    },
    "displayDuration": 10,
    "displayInterval": 3,
    "transitionDuration": 1.4,
    "themes": {},
    "style": {
        "backgroundColor": "black"
    },
    "scene": [
        {
            "tags": "level",
            "type": "text",
            "text": "Level",
            "style": {
                "z-index": "1"
            },
            "_id": "58ec074c1221d18411031173"
        },
        {
            "tags": "right",
            "type": "text",
            "text": "Roll right",
            "style": {
                "z-index": "1"
            },
            "_id": "58ec07561221d18411031174"
        },
        {
            "tags": "",
            "type": "audio",
            "volume": 100,
            "url": "https://soundcloud.com/user-297728422/new-for-test-old",
            "_id": "57988be8ec1e72d8833fe8f5"
        }
    ],
};

describe('AssetStore', function() {

    var store;
    var session;

    function clearMongo(callback){
        async.parallel([
            function(cb) {
                ImageMediaObject.remove({}, cb)
            },
            function(cb) {
                VideoMediaObject.remove({}, cb)
            },
            function(cb) {
                AudioMediaObject.remove({}, cb)
            },
            function(cb) {
                MediaScene.remove({}, cb)
            },
            function(cb) {
                Session.remove({}, cb)
            },
        ], callback);
    }

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

        after(function(done) {
            clearMongo(done);
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

        describe('audio', function() {
            it('should respond with 200 and a url', function (done) {
                var audioFile = 'test/audio/soundcloudAudioTest.mp3';
                this.request.field('token', session.id)
                    .field('mediaType', 'audio')
                    .field('filename', 'soundcloudAudioTest.mp3')
                    .attach('audio', audioFile)
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

    describe.only('POST to' + ADMIN_CONVERT_ASSET_API, function() {

        before(function(done) {
            async.parallel([
                function(cb) {
                    MediaScene.create(mediaSceneWithSoundcloudMediaAndOthers, cb)
                },
                function(cb) {
                    MediaScene.create(mediaSceneWithSoundcloudMedia, cb)
                }
            ], done);
        });

        after(function(done) {
            clearMongo(done);
        });

        beforeEach(function(){
            this.request = request.post(ADMIN_CONVERT_ASSET_API);
        });

        describe('without a token', function() {
            it('should respond with a 401', function (done) {
                this.request
                    .send('fake')
                    .end(function(err, res){
                        assert.equal(res.status, 401);
                        done();
                    });
            });
        });

        describe('without old url', function() {
            it('should respond with a 400', function (done) {
                this.request.field('token', session.id)
                    .field('fake', "fake")
                    .field('newUrl', "http://newurl.com")
                    .end(function(err, res){
                        assert.equal(res.status, 400);
                        done();
                    });
            });
        });

        describe('without old url', function() {
            it('should respond with a 400', function (done) {
                this.request.field('token', session.id)
                    .field('fake', "fake")
                    .field('oldUrl', "http://newurl.com")
                    .end(function(err, res){
                        assert.equal(res.status, 400);
                        done();
                    });
            });
        });

        describe('with all fields', function() {

            // APEP TODO should we do a test for invalid URLs that given?

            before(function(done){
                var self = this;
                var audioFile = 'test/audio/soundcloudAudioTest.mp3';
                request.post(ADMIN_UPLOAD_API).field('token', session.id)
                    .field('mediaType', 'audio')
                    .field('filename', 'soundcloudAudioTest.mp3')
                    .attach('audio', audioFile)
                    .end(function(err, result) {
                        assert.equal(result.status, 200);
                        var body = result.body;
                        assert(result.type, 'application/json');
                        assert(!body.tags, 'tags in response');
                        assert(body.url, 'no url in response');

                        self.audioUrl = body.url;
                        done();
                    });
            });

            it('should respond with a 200 and no URLS changed if oldURL is incorrect', function(done){
                var self = this;
                this.request.field('token', session.id)
                    .field('oldUrl', "https://soundcloud.com/incorrect")
                    .field('newUrl', self.audioUrl)
                    .end(function(err, res){
                        assert.equal(res.status, 200);
                        assert.equal(res.body.nModified, 0);
                        done();
                    });
            });

            it('should respond with a 200 and number of URLS changed given URLs that are correct [1]', function (done) {
                var self = this;
                this.request.field('token', session.id)
                    .field('oldUrl', "https://soundcloud.com/user-297728422/iybxju5ubzqh")
                    .field('newUrl', self.audioUrl)
                    .end(function(err, res){
                        assert.equal(res.status, 200);
                        assert.equal(res.body.nModified, 1);
                        done();

                        /*MediaScene.find({}, function(err, results) {
                            assert(!err);

                            assert(Array.isArray(results));

                            var searchForOld = _.filter(results[0].scene, function(mo){
                                return mo.url.indexOf('https://soundcloud.com/user-297728422/iybxju5ubzqh') !== -1;
                            });
                            var searchForNew = _.filter(results[0].scene, function(mo){
                                return mo.url.indexOf(self.audioUrl) !== -1;
                            });

                            assert.equal(searchForOld.length, 0);
                            assert.equal(searchForOld.length, 1);
                            done();
                        });*/
                    });
            });

            it('should respond with a 200 and number of URLS changed given URLs that are correct [2]', function (done) {
                var self = this;
                this.request.field('token', session.id)
                    .field('oldUrl', "https://soundcloud.com/user-297728422/new-for-test-old")
                    .field('newUrl', self.audioUrl)
                    .end(function(err, res){
                        assert.equal(res.status, 200);
                        assert.equal(res.body.nModified, 2);
                        done();

                        /*MediaScene.find({}, function(err, results) {
                            assert(!err);
                            assert(Array.isArray(results));
                            assert(results.length === 2);
                            var mediaObjectFromScene = results[0].scene[0];
                            assert.equal(mediaObjectFromScene.url.indexOf('soundcloud.com'), -1);
                            assert.equal(mediaObjectFromScene.url, self.audioUrl);
                            done();
                        });*/
                    });
            });

        });

    });
});