'use strict';
var fs = require('fs');
var xmp = require('./xmp');
var _ = require('lodash');
var xpath = require('xpath');
var DOMParser = require('xmldom').DOMParser;
var async = require('async');
var ImageProcessing = require('./image-processing');
var VideoProcessing = require('./video-processing');
var AudioProcessing = require('./sound-processing');
var moment = require('moment');

function _getDublinCoreTags(data, cb) {
    xmp.read(data, function (err, xmlData) {
        if (err) {
            cb(err);
        } else {

        }
    });
}

function _extractDublinCoreKeywords(xml) {
    var doc = new DOMParser().parseFromString(xml);
    var xpathSelect = xpath.useNamespaces({
        'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
        'dc': 'http://purl.org/dc/elements/1.1/'
    });
    var nodes = xpathSelect('//dc:subject/rdf:Bag/rdf:li/text()', doc);

    return (nodes.length === 0) ? null : _.map(nodes, function (v) {
            return v.data;
        });
}

function _extractViewChicagoTags(xml) {
    var match = /ViewChicago\:Image_Details="(.*?)"/g.exec(xml);
    return (!match) ? null : _.map(match[1].split(','), function (t) {
            return t.trim();
        });
}

function _getTags(data, cb) {
    xmp.read(data, function (err, xmlData) {
        if (err) {
            cb(err);
        } else {
            var result = xmlData ? _extractDublinCoreKeywords(xmlData) || _extractViewChicagoTags(xmlData) : null;
            cb(null, result);
        }
    });
}

function getImageMediaObjectThumbnailUrl(mediaObjectUrl) {
    if (!mediaObjectUrl || mediaObjectUrl.length == 0) {
        return mediaObjectUrl;
    }

    var trailingSlash = mediaObjectUrl.lastIndexOf('/');

    return mediaObjectUrl.substring(0, trailingSlash + 1) + "thumbnail-" + mediaObjectUrl.substring(trailingSlash + 1, mediaObjectUrl.length);
}

var transcoder = 1;

function getTranscoderValue() {

    if (transcoder < 4)
        transcoder++;
    else {
        transcoder = 1;
    }

    return transcoder;
}

function isSceneEmptyOrNoAdditionalMediaToFetch(mediaScene) {

    if(mediaScene.scene.length <= 0) {
        return true;
    }

    var imageOrVideoMedia = _.filter(mediaScene.scene, function(media){
        return media.type === "video" || media.type === "image";
    });

    return !(imageOrVideoMedia && imageOrVideoMedia.length > 0);
}

module.exports = {

    convertAssetUrlsInMediaScenes: function(MediaScene) {
        return function(req, res) {

            var oldUrl = req.body.oldUrl;
            var newUrl = req.body.newUrl;

            if(!oldUrl || !newUrl) {
                return res.status(400).send("Missing oldUrl or newUrl");
            }

            oldUrl = req.body.oldUrl.toString();
            newUrl = req.body.newUrl.toString();

            MediaScene.find({'scene.url': oldUrl}, function(err, scenes) {

                if(err) return res.status(400).send("Database find error");

                if(scenes.length === 0) {
                    return res.status(200).send({
                        nModified: 0
                    });
                }

                var count = 0;

                async.every(scenes, function(scene, callback) {

                    _.forEach(scene.scene, function(mo){
                        if(mo.url === oldUrl) {
                            mo.url = newUrl;
                            count++;
                        }
                    });

                    scene.save(function(err) {
                        if(err) {
                            console.log("scene.save - Database err: ", err.errors);
                        }
                        callback(err);
                    });

                }, function(err, results) {

                    console.log("MediaScenes - convertAssetUrlsInMediaScenes - oldUrl: " + oldUrl + ", newUrl: " + newUrl + ", count: " + count + ", err: " + err);

                    if(err) return res.status(400).send("Error during mongoose save");

                    return res.status(200).send({
                        nModified: count
                    });
                });
            });
        }
    },

    // APEP generic upload API - this is to allow administrative
    mediaObjectCreate: function(ImageMediaObject, VideoMediaObject, AudioMediaObject) {
        return function (req, res) {

            var mediaType = req.body.mediaType;

            // APEP missing file
            if (!req.files[mediaType] || !req.body.filename) {
                return res.sendStatus(400);
            }

            fs.readFile(req.files[mediaType].path, function (err, data) {
                if (err) throw err;

                var filePath = req.files[mediaType].path;
                var fileName = req.body.filename;

                var processor = null;
                var MediaObject = null;

                if(mediaType === "video") {
                    processor = VideoProcessing();
                    MediaObject = VideoMediaObject;
                } else if (mediaType === "image") {
                    processor = ImageProcessing();
                    MediaObject = ImageMediaObject;
                } else if (mediaType === "audio") {
                    processor = AudioProcessing();
                    MediaObject = AudioMediaObject;
                } else {
                    // APEP invalid media type and unable to find processor
                    return res.sendStatus(400);
                }

                processor.upload(MediaObject, filePath, fileName, function (error, mob) {
                    console.log("Successfully attempted a " + mediaType + " upload mob: ", mob);
                    res.status(200).send({
                        tags: "",
                        url: mob[mediaType].url,
                        type: mediaType
                    });
                });
            });
        }
    },

    getMediaSceneByName: function(MediaScene) {
        return function(req, res) {
            var sceneName = req.body.sceneName;

            console.log("/scene/by/name - sceneName: ", sceneName);

            MediaScene.find({"name": sceneName}, function(err, scene){
                if(err) {
                    return res.status(400).send("Error searching for scene by given sceneName");
                }

                if(!scene) {
                    return res.status(400).send("No scene found by given sceneName");
                }

                return res.status(200).send(scene);
            });
        };
    },

    getMediaSceneWithObjectsAppended: function(VideoMediaObject, ImageMediaObject, MediaScene) {
        return function(req, res) {
            var mediaSceneId = req.body.sceneId;

            MediaScene.findOne({_id: mediaSceneId}, function(err, mediaScene){
                if(err || !mediaScene) {
                    return res.sendStatus(400);
                }

                if(isSceneEmptyOrNoAdditionalMediaToFetch(mediaScene)) {
                    return res.send(mediaScene).end();
                }

                function appendFullMediaObjectToSceneMediaObject(mO, callback) {
                    if(mO.type !== "video") {
                        callback(null, mO);
                    } else {

                        if(mO.type === "video") {
                            VideoMediaObject.findOne({"video.url": mO.url}, function(err, vmob){
                                if(err || !vmob) {
                                    callback(null, null);
                                } else {
                                    callback(null, vmob);
                                }
                            });
                        }

                    }
                }

                var taskObject = {};

                _.forEach(mediaScene.scene, function(mO, index) {
                    taskObject[index] = appendFullMediaObjectToSceneMediaObject.bind(null, mO);
                });

                async.parallel(taskObject, function(err, results){
                    if(err) {
                        return res.statusCode(400);
                    }

                    console.log("results: ", results);

                    _.forEach(Object.keys(results), function(resultKey) {
                        var vmob = results[resultKey];

                        console.log("forEach Result - vmob: ", vmob);

                        if(vmob) {
                            var index = _.indexOf(mediaScene.scene, function(mo){
                                return mo.url === vmob.video.url;
                            });

                            if(index !== -1) {
                                mediaScene.scene[index].vmob = vmob;
                            }
                        }
                    });

                    res.send(mediaScene).end();
                });
            });
        }
    },

    videoCreateFromVimeoDownloader: function(VideoMediaObject, MediaScene) {
        return function(req, res) {

            console.log("Begin: videoCreateFromVimeoDownloader");


            var fileVideoName = req.body.filename;
            var videoDescription = req.body.description;
            var videoName = req.body.name;
            var vimeoId = req.body.vimeoId;
            var size = req.body.size;
            var transcoder = getTranscoderValue();

            var videoProcessor = VideoProcessing();

            videoProcessor.storeVimeoVideo(VideoMediaObject, fileVideoName, videoName, vimeoId, transcoder, videoDescription, size, function (err, vmod) {
                console.log("Successfully attempted a video upload from vimeo download: ", vmod);

                var query = {'scene.url': 'https://vimeo.com/' + vimeoId};
                var update = {$set: {'scene.$.url': vmod.video.url}};
                var options = {new: false, multi: true};

                //search for scenes that have the vimeo url
                MediaScene.update(query, update, options, function (err, data) {
                    if (err)
                        throw err;

                    console.log("Updated all scene references to use the non vimeo url");

                    res.status(200).send(vmod);
                });

            });

        }
    },

    resumableAudioCreate: function(AudioMediaObject, resumableCompletedFilePath, resumableCompletedFileName, callback) {
        fs.readFile(resumableCompletedFilePath, function (err, data) {
            if (err) throw err;

            var fileAudioPath = resumableCompletedFilePath;
            var fileAudioName = resumableCompletedFileName;

            var audioProcessor = AudioProcessing();

            audioProcessor.upload(AudioMediaObject, fileAudioPath, fileAudioName, function(err, amod) {
                console.log("Successfully attempted a audio upload amod: ", amod);
                callback({
                    tags: "",
                    url: amod.audio.url
                });
            });
        });
    },

    resumableVideoCreate: function (VideoMediaObject, resumableCompletedFilePath, resumableCompletedFileName, callback) {
        fs.readFile(resumableCompletedFilePath, function (err, data) {
            if (err) throw err;

            var fileVideoPath = resumableCompletedFilePath;
            var fileVideoName = resumableCompletedFileName;

            var videoProcessor = VideoProcessing();
            videoProcessor.upload(VideoMediaObject, fileVideoPath, fileVideoName, function (error, vmod) {
                console.log("Successfully attempted a video upload vmod: ", vmod);
                callback({
                    tags: "",
                    url: vmod.video.url
                });
            });
        });
    },

    retrieveMediaForTranscoding: function (VideoMediaObject, AudioMediaObject) {
        return function (req, res) {

            function findMediaForTranscoding(MediaObject, callback) {
                MediaObject.find({hasTranscoded: false}, function (err, data) {
                    if (err) return callback(true);
                    callback(null, data)
                });
            }

            var taskObject = {
                0: findMediaForTranscoding.bind(null, VideoMediaObject),
                1: findMediaForTranscoding.bind(null, AudioMediaObject)
            };

            async.parallel(taskObject, function(err, results){
                if (err) return res.sendStatus(400);

                var mediaObjects = [];

                _.forEach(Object.keys(results), function(resultKey){
                    mediaObjects = mediaObjects.concat(results[resultKey]);
                });

                var mediaForTranscoding = {
                    mediaForTranscoding: mediaObjects
                };

                res.status(200).send(mediaForTranscoding);
            });

        }
    },

    retrieveVideoMediaTranscodedStatus: function (VideoMediaObject) {
        return function (req, res) {
            var indices = [];
            for (var i = 0; i < req.body.url.length; i++) {
                if (req.body.url[i] === "/") indices.push(i + 1);
            }
            var assetId = req.body.url.substring(indices[indices.length - 2], (indices[indices.length - 1] - 1));
            VideoMediaObject.findOne({_id: assetId}, function (err, data) {
                if (err) return res.sendStatus(400);

                console.log("retrieveVideoMediaStranscodedStatus - searching and found vmob for transcoded status - vmod: ", data);

                res.status(200).send({parentId:req.body.parentId,data:data});
            });
        }
    },

    updateMediaForTranscodingStarted: function (VideoMediaObject) {
        return function (req, res) {
            console.log("updateMediaForTranscodingStarted: ", req.body);

            var transcodingMediaObject = req.body.transcodingMediaObject;

            if (!transcodingMediaObject) {
                return res.status(400).send('No transcoding media data found');
            }

            var conditions = {_id: transcodingMediaObject._id}
                , update = {transcodingStartedTimestamp: moment.utc() }
                , options = {multi: false};

            VideoMediaObject.update(conditions, update, options, function (err, numAffected) {
                if (err) {
                    console.log("updateMediaForTranscodingStarted - database update error - err: ", err);
                    return res.status(400).send('Database failure - please check the logs');
                }

                return res.sendStatus(200);
            });
        }
    },

    updateMediaForTranscoding: function (VideoMediaObject, AudioMediaObject) {
        return function (req, res) {

            console.log("updateMediaForTranscoding: ", req.body);

            var transcodedMediaData = req.body.transcodedMedia;

            if (!transcodedMediaData) {
                return res.status(400).send('No transcoded media data found');
            }

            var totalTranscodedMedia = 0;
            if (transcodedMediaData.length === 0) {
                return res.status(200).send({
                    updatedMediaCount: totalTranscodedMedia
                });
            }

            _.forEach(transcodedMediaData, function (transcodedMedia) {

                var conditions = {_id: transcodedMedia._id}
                    , update = {hasTranscoded: true, transcodedTimestamp: moment.utc() }
                    , options = {multi: false};

                var MediaObject = transcodedMedia.type && transcodedMedia.type === "audio" ? AudioMediaObject : VideoMediaObject;

                MediaObject.update(conditions, update, options, function (err, numAffected) {
                    if (err)
                        return res.statusCode(400);

                    totalTranscodedMedia += numAffected.nModified;

                    if (transcodedMedia._id === transcodedMediaData[transcodedMediaData.length - 1]._id) {
                        return res.status(200).send({
                            updatedMediaCount: totalTranscodedMedia
                        });
                    }
                });
            });

        }
    },

    //TODO remove unused videos

    resumableImageCreate: function (ImageMediaObject, resumableCompletedFilePath, resumableCompletedFileName, callback) {
        fs.readFile(resumableCompletedFilePath, function (err, data) {
            if (err) throw err;

            var fileImagePath = resumableCompletedFilePath;
            var fileImageName = resumableCompletedFileName;

            _getTags(data, function (err, tags) {
                if (err) {
                    return res.status(400).send({error: err});
                }

                var imageProcessor = ImageProcessing();

                imageProcessor.upload(ImageMediaObject, fileImagePath, fileImageName, function (err, imob) {
                    console.log("Successfully saved new ImageMediaObject err:", err);
                    console.log("Successfully saved new ImageMediaObject to asset store and mongo storage imob:", imob);

                    // APEP TODO we should just callback;
                    if(err) throw err;

                    callback({
                        tags: tags,
                        url: imob.image.url
                    });
                });
            });
        });
    },


    // APEP TODO this is defunct now and will need to be updated.
    removeUnusedImages: function(ImageMediaObject, MediaScene) {
        return function(req, res) {

            return res.status(500).send("Not currently supported");

            // first get all of the image urls in the scenes
            MediaScene.find({'scene.type': 'image'}, 'scene.url', function(err, docs) {
                // get all image urls in all docs, unique the list
                // pretty big hack here, this should really be done at the db level,
                // but that can be fixed down the road
                var undefinedOrNull = function(v) { return v  === undefined || v === null };
                var imgUrls = _(_.map(docs, function(x) {return x.toObject();}))
                                .pluck('scene')
                                .flatten()
                                .reject(undefinedOrNull)
                                .pluck('url')
                                .uniq()
                                .valueOf();

                //Bit of a niggly hack but map the imgUrls within the scene into arrays providing their thumbnail counterpart
                imgUrls = _(_.map(imgUrls, function(x) { return [x, getImageMediaObjectThumbnailUrl(x) ]}))
                    .flatten()
                    .valueOf();
                        
                ImageMediaObject.find().where('image.url').nin(imgUrls).exec(function(err, imgDocs) {
                    // we have to call delete on each one to trigger the deletion of the record in the blob
                    async.mapLimit(imgDocs, 4, function(imob, callback) {
                        imob.remove(callback);
                    }, function(err) {
                        if (err) {
                            res.status(500).send(err.toString());
                        } else {
                            res.sendStatus(200);
                        }
                    });
                });
            });
        };
    }
};
