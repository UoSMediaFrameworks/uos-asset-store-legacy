'use strict';

var objectAssign = require('object-assign');
var express = require('express');
var http = require('http');
var multer = require('multer');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var ImageMediaObjectSchema = require('./schemas/image-media-object-schema');
var VideoMediaObjectSchema = require('./schemas/video-media-object-schema');
var SessionSchema = require('./schemas/session-schema');
var MediaSceneSchema = require('./schemas/media-scene-schema');
var routes = require('./routes');



var AssetStore = function(ops) {
    this._ops = ops;

    var app = express(),
        router = express.Router();
    
    this._server = http.Server(app);
    
    var db = mongoose.createConnection(ops.mongoConnection); 
    var ImageMediaObject = db.model('ImageMediaObject', ImageMediaObjectSchema);
    var VideoMediaObject = db.model('VideoMediaObject', VideoMediaObjectSchema);
    var Session = db.model('sessions', SessionSchema);
    var MediaScene = db.model('MediaScene', MediaSceneSchema, 'mediaScenes');

    app.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    });

    app.use(bodyParser.json({limit: '1024mb'}));
    app.use(bodyParser.urlencoded({limit: '1024mb', extended: true}));

    app.use(multer({
        dest: this._ops.uploadDir
    }));
    
    router.post('/videos', routes.videoCreate(VideoMediaObject));
    
    //TODO remove unusued videos
    
    router.post('/images', routes.imageCreate(ImageMediaObject));

    //APEP Place holder for final transcation to save media to the DB
    router.post('/resumable/upload/media', function(req, res){
        console.log("resumable-images - req.body: ", req.body);

        res.sendStatus(200);
    });

    //APEP Place holder for each chunk upload
    router.post('/resumable/final', function(req, res){
        res.status(200).send({
            tags: "",
            url: "http://example.com"
        });
    });
    
    router.post('/remove-unused-images', routes.removeUnusedImages(ImageMediaObject, MediaScene));

    function requireToken(req, res, next) {

        console.log("Looking for session in body: " + req.body);

        if ( req.body.token ) {

            console.log("Looking for session with _id: " + req.body.token);

            Session.findOne({'_id': req.body.token}, function(err, sess) {
                if (err) throw err;

                if (sess) {
                    next();
                } else {
                    res.sendStatus(401);
                }
            });
        } else {
            res.sendStatus(401);
        }
    }

    app.use('/api', requireToken, router);    
    
    app.get('/media-for-transcoding', routes.retrieveMediaForTranscoding(VideoMediaObject));
    app.post('/media-transcoded', routes.updateMediaForTranscoding(VideoMediaObject));

    //APEP one off api for split transcoding from vimeo upload
    app.get('/one-off/media-for-transcoding', routes.retrieveMediaForTranscodingForVimeoBatchUploading(VideoMediaObject));

    app.post('/vimeo/media-for-transcoding', routes.videoCreateFromVimeoDownloader(VideoMediaObject, MediaScene));
};

AssetStore.prototype.listen = function(cb) {
    // init the container
    this._server.listen(this._ops.port, cb);
};

AssetStore.prototype.close = function(cb) {
    this._server.close(cb);
};

module.exports = AssetStore;