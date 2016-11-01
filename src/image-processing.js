'use strict';

var sharp = require('sharp');
var async = require('async');

const thumbnailHeight = 90;
const maxImageHeight = 768;

module.exports = function() {
    return {

        storeImage: function(ImageMediaObject, imageFilePath, imageFileName, callback) {
            var imob = new ImageMediaObject();
            imob.attach('image', { id: imob._id, path: imageFilePath, name: imageFileName }, function(error, result) {
                if (error) throw error;

                imob.save(function(error) {
                    if (error) throw error;

                    callback(null, imob);
                });
            });
        },

        uploadThumbnailImage: function(ImageMediaObject, imageFilePath, imageFileName, imageToUpload, callback) {
            var self = this;
            var thumbnailImageFilePath = imageFilePath + "-thumbnail";
            var thumbnailImageFileName = "thumbnail-" + imageFileName;
            imageToUpload
                .resize(undefined, thumbnailHeight)
                .toFile(thumbnailImageFilePath, function(err) {

                    if(err) throw err;

                    self.storeImage(ImageMediaObject, thumbnailImageFilePath, thumbnailImageFileName, callback);

                });
        },

        getImageMetadata: function(imageToUpload, callback){
            //meta data provides the data required for the requirements - size namely
            imageToUpload
                .metadata(function(err, metadata){
                    if(err) throw err;
                    
                    callback(metadata);
                });
        },

        uploadImage: function(ImageMediaObject, imageFilePath, imageFileName, imageToUpload, callback) {
            var self = this;
            async.parallel([
               function(callback) {
                   var resizedImageFilePath = imageFilePath + "-resized";
                   var resizedImageFileName = "resized-" + imageFileName;
                   imageToUpload
                       .resize(undefined, maxImageHeight)
                       .toFile(resizedImageFilePath , function(err){
                           if(err) throw err;
                           self.storeImage(ImageMediaObject, resizedImageFilePath, resizedImageFileName, callback);
                       });
               }, function(callback) {
                    self.storeImage(ImageMediaObject, imageFilePath, imageFileName, callback);
                }
            ], function(err, results){
                if(err) throw err;
                callback(results[1]);
            });
        }
    }
};