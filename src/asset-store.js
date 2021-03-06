'use strict';

var express = require('express');
var http = require('http');
var multer = require('multer');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var ImageMediaObjectSchema = require('./schemas/image-media-object-schema');
var VideoMediaObjectSchema = require('./schemas/video-media-object-schema');
var AudioMediaObjectSchema = require('./schemas/audio-media-object-schema');
var SessionSchema = require('./schemas/session-schema');
var MediaSceneSchema = require('./schemas/media-scene-schema');
var routes = require('./routes');
var fs = require('fs');
var async = require('async');
const osTmpdir = require('os-tmpdir');
var resumableMediaUploadTempDir = osTmpdir() + "/";

const IMAGE_RESUMABLE_MEDIA_TYPE = "image";
const VIDEO_RESUMABLE_MEDIA_TYPE = "video";
const AUDIO_RESUMABLE_MEDIA_TYPE = "audio";

var AssetStore = function (ops) {
    this._ops = ops;

    var app = express(),
        router = express.Router();

    this._server = http.Server(app);

    var db = mongoose.createConnection(ops.mongoConnection);

    // APEP Using mongoose, get handles to each of the document stores
    var ImageMediaObject = db.model('ImageMediaObject', ImageMediaObjectSchema);
    var VideoMediaObject = db.model('VideoMediaObject', VideoMediaObjectSchema);
    var AudioMediaObject = db.model('AudioMediaObject', AudioMediaObjectSchema);

    var Session = db.model('sessions', SessionSchema);
    var MediaScene = db.model('MediaScene', MediaSceneSchema, 'mediaScenes');

    // APEP set cross origin headers to allow our different environment and DNS addresses access to the API
    app.use(function (req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    });

    // APEP ensure the upload size is suitable : TODO using resumable JS, this could be reduced.
    app.use(bodyParser.json({limit: '1024mb'}));
    app.use(bodyParser.urlencoded({limit: '1024mb', extended: true}));

    app.use(multer({
        dest: this._ops.uploadDir
    }));

    router.post('/isTranscoded', routes.retrieveVideoMediaTranscodedStatus(VideoMediaObject));

    //TODO remove unusued videos

    // APEP Upload Chunk API
    router.post('/resumable/upload/media', function (req, res) {

        var resumableFilename = req.body.resumableFilename;
        var resumableChunkNumber = req.body.resumableChunkNumber;
        var resumableIdentifier = req.body.resumableIdentifier;
        // APEP create the resumableFilePath for the chunk, each chunk is stored in os.tmp directory with;
        // chunk number - asset upload id (ie a front end generated token for the asset to be uploaded) - file name including extension
        var resumableFilePath = resumableMediaUploadTempDir + resumableChunkNumber + "-" + resumableIdentifier + resumableFilename;

        var tmpFilePath = req.files.file.path;

        // APEP read the file from the HTTP request and write to file system
        fs.readFile(tmpFilePath, function (err, data) {

            if (err) {
                console.log("/resumable/upload/media - read chunk file from http post err");
                return res.sendStatus(400);
            }

            fs.writeFile(resumableFilePath, data, function (err) {
                if (err) {
                    console.log("/resumable/upload/media - write chunk file err");
                    res.sendStatus(400);
                } else {
                    console.log("/resumable/upload/media - write chunk file success");
                    res.sendStatus(200);
                }
            });
        });
    });

    // APEP Upload completed API
    router.post('/resumable/final', function (req, res) {

        console.log("/resumable/final request made : " + JSON.stringify(req.body));

        var numberOfChunks = req.body.numberOfChunks;
        var relativePath = req.body.relativePath;
        var resumableIdentifier = req.body.uniqueIdentifier;
        var mediaType = req.body.mediaType;

        // APEP async function to write chunk to a single stream, the write stream is reused for each chunk 
        function readChunkAndWriteToFile(chunkFilePath, writeStream, isEnd, callback) {
            var r = fs.createReadStream(chunkFilePath);

            r.pipe(writeStream, {
                end: isEnd
            });

            r.on('end', function () {
                callback(null, true)
            });
        }

        var finalMediaObjectFilePath = resumableMediaUploadTempDir + resumableIdentifier + relativePath;
        var w = fs.createWriteStream(finalMediaObjectFilePath);

        var taskObject = {};

        // APEP for each chunk, create async task object populated with a function to read and write streams per chunk, 
        // this is going to be executed in series with support for async read and writing of streams
        for (var i = 1; i <= numberOfChunks; i++) {
            var fileName = resumableMediaUploadTempDir + i + "-" + resumableIdentifier + relativePath;
            taskObject[i] = readChunkAndWriteToFile.bind(null, fileName, w, i === numberOfChunks);
        }

        // APEP run the task object through async series, if the result is successful we know we've written the chunks
        // back to a single file and now can be written to DB and Azure blob storage
        async.series(taskObject, function (err, results) {
            if (err) {
                return res.statusCode(400);
            }

            // APEP Detect media type and storage & save correctly per type of media
            if (mediaType === IMAGE_RESUMABLE_MEDIA_TYPE) {
                routes.resumableImageCreate(ImageMediaObject, finalMediaObjectFilePath, relativePath, function (vmob) {
                    res.status(200).send(vmob);
                });
            } else if (mediaType === VIDEO_RESUMABLE_MEDIA_TYPE) {
                routes.resumableVideoCreate(VideoMediaObject, finalMediaObjectFilePath, relativePath, function (vmob) {
                    res.status(200).send(vmob);
                });
            } else if (mediaType === AUDIO_RESUMABLE_MEDIA_TYPE) {
                routes.resumableAudioCreate(AudioMediaObject, finalMediaObjectFilePath, relativePath, function (amob) {
                    res.status(200).send(amob);
                });
            } else {
                res.statusCode(400);
            }
        });
    });

    // APEP Admin Upload API for things like conversion of external asset to local asset
    // APEP TODO should be within a new router object, with prepend /admin/api and session check with a groupID check
    router.post('/upload/media', routes.mediaObjectCreate(ImageMediaObject, VideoMediaObject, AudioMediaObject));

    router.post('/upload/convert', routes.convertAssetUrlsInMediaScenes(MediaScene));

    router.post('/scene/full', routes.getMediaSceneWithObjectsAppended(VideoMediaObject, ImageMediaObject, MediaScene));

    router.post('/scene/by/name', routes.getMediaSceneByName(MediaScene));

    router.post('/remove-unused-images', routes.removeUnusedImages(ImageMediaObject, MediaScene));

    function requireToken(req, res, next) {

        if (req.method === "OPTIONS") {
            return next();
        }

        if (req.body.token) {

            console.log("Looking for session with _id: " + req.body.token);

            Session.findOne({'_id': req.body.token}, function (err, sess) {
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

    // APEP Non secured API endpoints for communication with our python transcoder job submission app
    // TODO review the security and implement some basic measures.
    app.get('/media-for-transcoding', routes.retrieveMediaForTranscoding(VideoMediaObject, AudioMediaObject));
    app.post('/media-transcoded', routes.updateMediaForTranscoding(VideoMediaObject, AudioMediaObject));
    app.post('/media-transcoding-started', routes.updateMediaForTranscodingStarted(VideoMediaObject));

    // APEP one off api for split transcoding from vimeo upload TODO deprecated
    app.post('/vimeo/media-for-transcoding', routes.videoCreateFromVimeoDownloader(VideoMediaObject, MediaScene));

    // APEP one off api for soundcloud work
    app.post('/upload/media', routes.mediaObjectCreate(ImageMediaObject, VideoMediaObject, AudioMediaObject));
    app.post('/upload/convert', routes.convertAssetUrlsInMediaScenes(MediaScene));
};

AssetStore.prototype.listen = function (cb) {
    // init the container
    this._server.listen(process.env.PORT, cb);
};

AssetStore.prototype.close = function (cb) {
    this._server.close(cb);
};

module.exports = AssetStore;