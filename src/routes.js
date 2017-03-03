'use strict';
var fs = require('fs');
var xmp = require('./xmp');
var _ = require('lodash');
var xpath = require('xpath');
var DOMParser = require('xmldom').DOMParser;
var async = require('async');
var sharp = require('sharp');
var ImageProcessing = require('./image-processing');
var VideoProcessing = require('./video-processing');

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

    var imageOrVideoMedia = _.find(mediaScene.scene, function(media){
        return media.type === "video" || media.type === "image";
    });

    if(imageOrVideoMedia && imageOrVideoMedia.length > 0) {
        return true;
    }

    return imageOrVideoMedia && imageOrVideoMedia.length > 0;
}

module.exports = {

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
                                    callback(null, mO);
                                } else {
                                    mO.vmob = vmob;
                                    callback(null, mO);
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

                    var scene = [];
                    _.forEach(Object.keys(results), function(resultKey){
                        scene.push(results[resultKey]);
                    });

                    mediaScene.scene = scene;

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

    resumableVideoCreate: function (VideoMediaObject, resumableCompletedFilePath, resumableCompletedFileName, callback) {
        fs.readFile(resumableCompletedFilePath, function (err, data) {
            if (err) throw err;

            var fileVideoPath = resumableCompletedFilePath;
            var fileVideoName = resumableCompletedFileName;

            var videoProcessor = VideoProcessing();
            videoProcessor.uploadVideo(VideoMediaObject, fileVideoPath, fileVideoName, function (error, vmod) {
                console.log("Successfully attempted a video upload vmod: ", vmod);
                callback({
                    tags: "",
                    url: vmod.video.url
                });
            });
        });
    },

    videoCreate: function (VideoMediaObject) {
        return function (req, res) {
            if (!req.files.video) {
                return res.sendStatus(400);
            }

            fs.readFile(req.files.video.path, function (err, data) {
                if (err) throw err;

                var fileVideoPath = req.files.video.path;
                var fileVideoName = req.body.filename;

                var videoProcessor = VideoProcessing();
                videoProcessor.uploadVideo(VideoMediaObject, fileVideoPath, fileVideoName, function (error, vmod) {
                    console.log("Successfully attempted a video upload vmod: ", vmod);
                    res.status(200).send({
                        tags: "",
                        url: vmod.video.url
                    });
                });

            });
        }
    },

    retrieveMediaForTranscoding: function (VideoMediaObject) {
        return function (req, res) {
            VideoMediaObject.find({hasTranscoded: false}, function (err, data) {
                if (err) return res.sendStatus(400);

                var mediaForTranscoding = {
                    mediaForTranscoding: data
                };

                res.status(200).send(mediaForTranscoding);
            });
        }
    },

    retrieveMediaForTranscodingForVimeoBatchUploading: function (VideoMediaObject) {
        return function (req, res) {
            //APEP: We updated any VMOB that was not in a scene to be ignored true, this takes all not ignored and limits
            //APEP: vimeoId lte is used to split the media in half during this manual batch process
            var q = VideoMediaObject.find({hasTranscoded: false, ignore: false});

            q.exec(function (err, data) {
                if (err) return res.sendStatus(400);


                var mediaForTranscoding = {
                    mediaForTranscoding: data
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

    updateMediaForTranscoding: function (VideoMediaObject) {
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
                    , update = {hasTranscoded: true}
                    , options = {multi: false};

                VideoMediaObject.update(conditions, update, options, function (err, numAffected) {
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
            var imageToUpload = sharp(fileImagePath);

            _getTags(data, function (err, tags) {
                if (err) {
                    return res.status(400).send({error: err});
                }

                var imageProcessor = ImageProcessing();
                // Indiscriminately upload a thumbnail for each image uploaded
                imageProcessor.uploadThumbnailImage(ImageMediaObject, fileImagePath, fileImageName, imageToUpload, function (err, thumbnailImob) {
                    imageProcessor.uploadImage(ImageMediaObject, fileImagePath, fileImageName, imageToUpload, function (imob) {
                        console.log("Successfully saved new ImageMediaObject to asset store and mongo storage imob:", imob);
                        callback({
                            tags: tags,
                            url: imob.image.url
                        });
                    });
                });
            });
        });
    },

    imageCreate: function (ImageMediaObject) {
        return function (req, res) {
            if (!req.files.image) {
                return res.sendStatus(400);
            }

            fs.readFile(req.files.image.path, function (err, data) {
                if (err) throw err;

                var fileImagePath = req.files.image.path;
                var fileImageName = req.body.filename;
                var imageToUpload = sharp(fileImagePath);

                _getTags(data, function (err, tags) {
                    if (err) {
                        return res.status(400).send({error: err});
                    }

                    var imageProcessor = ImageProcessing();
                    // Indiscriminately upload a thumbnail for each image uploaded
                    imageProcessor.uploadThumbnailImage(ImageMediaObject, fileImagePath, fileImageName, imageToUpload, function (err, thumbnailImob) {
                        imageProcessor.uploadImage(ImageMediaObject, fileImagePath, fileImageName, imageToUpload, function (imob) {
                            console.log("Successfully saved new ImageMediaObject to asset store and mongo storage imob:", imob);
                            res.status(200).send({
                                tags: tags,
                                url: imob.image.url
                            });
                        });
                    });
                });

            });
        };
    },

    removeUnusedImages: function(ImageMediaObject, MediaScene) {
        return function(req, res) {
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
