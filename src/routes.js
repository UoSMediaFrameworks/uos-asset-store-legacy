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


module.exports = {
    imageUpload: function(azureStorageConfig) {
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
                            res.status(200).send({
                                tags: tags,
                                url: 'http://aoeus.com'
                            });    
                        }
                    });

                });
            }
        };
    }
};