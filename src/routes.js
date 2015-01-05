'use strict';
var fs = require('fs');
var xmp = require('./xmp');
var _ = require('lodash');
var xpath = require('xpath');
var DOMParser = require('xmldom').DOMParser;

function _getTags (data, cb) {
    xmp.read(data, function(err, xmlData) {
        if (err) {
            cb(err);
        } else {
            var doc = new DOMParser().parseFromString(xmlData);
            var xpathSelect = xpath.useNamespaces({
                'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
                'dc': 'http://purl.org/dc/elements/1.1/'
            });
            var nodes = xpathSelect('//dc:subject/rdf:Bag/rdf:li/text()', doc);

            if (nodes.length === 0) {
                cb('Dublin Core keywords tags not found in xmp');
            } else {
                cb(null, _.map(nodes, function(v) { return v.data; }));    
            }
        }
    });    
}


module.exports = {
    imageCreate: function(ImageMediaObject) {
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
                            var imob = new ImageMediaObject();
                            imob.attach('image', {path: req.files.image.path}, function(error, result) {
                                if (error) throw error;

                                imob.save(function(error) {
                                    if (error) throw error;

                                    res.status(200).send({
                                        tags: tags,
                                        url: imob.image.url
                                    });            
                                });
                            });
                        }
                    });

                });
            }
        };
    }
};