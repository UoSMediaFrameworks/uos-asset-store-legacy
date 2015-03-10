'use strict';

var assert = require('assert');
var AssetStore = require('../src/asset-store');
var supertest = require('supertest');
var port = 4001;
var request = supertest('localhost:' + port);
var azureStorage = require('azure-storage');
var async = require('async');

var imagesAPIUrl = '/api/images';
var removeUnusedImagesAPIUrl = '/api/remove-unused-images';
var dublinCoreFile = 'test/images/1836 Map.jpg';
var viewChicagoFile = 'test/images/viewChicagoTagged.jpg';
var xmpNoViewFile = 'test/images/noDublinCoreKeywords.jpg';
var noXmpFile = 'test/images/noXmp.jpg';
var config = require('../config');
var objectAssign = require('object-assign');
var mongoose = require('mongoose');
var SessionSchema = require('../src/schemas/session-schema');
var ImageMediaObjectSchema = require('../src/schemas/image-media-object-schema');
var MediaSceneSchema = require('../src/schemas/media-scene-schema');

var db = mongoose.createConnection(config.mongoConnection); 
var Session = db.model('Session', SessionSchema);
var ImageMediaObject = db.model('ImageMediaObject', ImageMediaObjectSchema);
var MediaScene = db.model('MediaScene', MediaSceneSchema, 'mediaScenes');

function clearBlobStorage (cbsCallback) {
    // clear up the storage blob
    var blobSvc = azureStorage.createBlobService(config.azureStorageAccount, config.azureStorageAccessKey);
    blobSvc.createContainerIfNotExists(config.azureStorageContainer, {publicAccessLevel: 'blob'}, function(error, result, response) {
        if (error) {
            cbsCallback(error);
        } 
        // get all blobs
        blobSvc.listBlobsSegmented(config.azureStorageContainer, null, function(err, result, response) {
            // delete them 4 at a time
            async.mapLimit(result.entries, 4, function(blob, mlCallback) {
                blobSvc.deleteBlob(config.azureStorageContainer, blob.name, function(err, response) {
                    mlCallback(err, response);
                });
            }, cbsCallback);
        });
    });
}

function clearMongo (callback) {
    ImageMediaObject.remove({}, function() {
        MediaScene.remove({}, callback);
    });
}

function clearData (callback) {
    async.parallel([
        clearMongo, clearBlobStorage
    ], callback);
}

function uploadImage (imgPath, sessionId) {
    return function (callback) {
        request.post(imagesAPIUrl)
            .field('token', sessionId)
            .attach('image', imgPath)
            .end(function(err, result) {
                callback(err, result.body.url);
            });
    };
}

function createScene(scene) {
    return function (callback) {
        MediaScene.create({
            scene: scene
        }, callback);
    };
}

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
        async.parallel(
            [
                clearData,
                store.close.bind(store)
            ], 
            done
        );
    });

    describe('POST to ' + removeUnusedImagesAPIUrl, function () {
        beforeEach(function (done) {
            var self = this;

            async.parallel([
                uploadImage(dublinCoreFile, session.id),
                uploadImage(dublinCoreFile, session.id),
            ], function(err, results) {
                if (err) done(err);
                
                self.unusedImageUrl = results[0];
                self.usedImageUrl = results[1];
                
                async.parallel([
                    createScene([
                        {type: 'image', url: self.usedImageUrl},
                        {type: 'image', url: 'http://somenonbloburl.com/img.jpg'}
                    ]),
                    createScene([
                        {type: 'image', url: 'http://somenonbloburl.com/img.jpg'}
                    ])
                ], function(err, results) {
                    request.post(removeUnusedImagesAPIUrl)
                        .field('token', session.id)
                        .expect(200)
                        .end(done);    
                }); 
            });
        });

        afterEach(function (done) {
            clearData(done);
        });

        it('should remove all images from blob store that aren\'t in a scene', function (done) {
            ImageMediaObject.find({'image.url': this.unusedImageUrl}, null, function(err, docs) {
                assert.equal(docs.length, 0);
                done();
            });
        });

        it('should not remove images that are in a scene', function (done) {
           ImageMediaObject.find({'image.url': this.usedImageUrl}, null, function(err, docs) {
               assert.equal(docs.length, 1);
               done();
           }); 
        });
    });

    describe('POST to ' + imagesAPIUrl, function () {
        beforeEach(function () {
            this.request = request.post(imagesAPIUrl);
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