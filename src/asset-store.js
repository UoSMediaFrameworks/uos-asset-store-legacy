'use strict';

var objectAssign = require('object-assign');
var express = require('express');
var http = require('http');
var multer = require('multer');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var ImageMediaObjectSchema = require('./schemas/image-media-object-schema');
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
    var Session = db.model('sessions', SessionSchema);
    var MediaScene = db.model('MediaScene', MediaSceneSchema, 'mediaScenes');

    app.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    });

    app.use(bodyParser.urlencoded({ extended: false }));

    app.use(multer({
        dest: this._ops.uploadDir
    }));
    
    router.post('/images', routes.imageCreate(ImageMediaObject));

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
};

AssetStore.prototype.listen = function(cb) {
    // init the container
    this._server.listen(this._ops.port, cb);
};

AssetStore.prototype.close = function(cb) {
    this._server.close(cb);
};

module.exports = AssetStore;