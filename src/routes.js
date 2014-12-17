'use strict';
var fs = require('fs');
var xmp = require('./xmp');
var _ = require('lodash');

function _getTags (data, cb) {
    xmp.read(data, function(err, xmlData) {
        if (err) {
            cb(err);
        } else {
            var imageDetails = /ViewChicago\:Image_Details="(.*?)"/g.exec(xmlData)[1];

            cb(null, _.map(imageDetails.split(','), function(t) { return t.trim(); }));
        }
    });    
}

function _blobUrl (blobResult) {
    return 'https://smassetstore.blob.core.windows.net/' + blobResult.container + '/' + blobResult.blob;
}

module.exports = {
    imageUpload: function(storage, containerName) {
        return function(req, res) {
            if (! req.files.image) {
                res.sendStatus(400);
            } else {
                fs.readFile(req.files.image.path, function(err, data) {
                    if (err) throw err;
                    _getTags(data, function(err, tags) {
                        if (err) {
                            res.status(400).send({error: err});
                        } else {
                            // put the file in blob storage
                            storage.createBlockBlobFromLocalFile(containerName, req.files.image.name, req.files.image.path, function(error, result, response) {
                                if (error) throw error;
                                
                                res.status(200).send({
                                    tags: tags,
                                    url: _blobUrl(result)
                                });        
                            });
                        }
                    });

                });
            }
        };
    }
};