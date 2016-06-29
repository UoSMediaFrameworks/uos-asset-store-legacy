'use strict';

var sharp = require('sharp');

const thumbnailHeight = 90;
const maxImageHeight = 768;

module.exports = function() {
    return {

        storeImage: function(ImageMediaObject, imageFilePath, imageFileName, callback) {
            var imob = new ImageMediaObject();
            imob.attach('image', {path: imageFilePath, name: imageFileName }, function(error, result) {
                if (error) throw error;

                imob.save(function(error) {
                    if (error) throw error;

                    callback(imob);
                });
            });
        },

        uploadThumbnailImage: function(ImageMediaObject, imageFilePath, imageFileName, imageToUpload, callback) {
            var self = this;
            var thumbnailImageFilePath = imageFilePath + "-thumbnail.jpg";
            var thumbnailImageFileName = imageFileName + "-thumbnail.jpg";
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

        saveImage: function(ImageMediaObject, imageFilePath, imageFileName, imageToUpload, callback) {

            console.log("SaveImage: [ imageFilePath: " + imageFilePath + "," +
                "imageFileName: " + imageFileName + "]");

            var self = this;

            this.getImageMetadata(imageToUpload, function(metaData){
                if(metaData.height > maxImageHeight) {

                    var resizedImageFilePath = imageFilePath + "-resized.jpg";
                    
                    imageToUpload
                        .resize(undefined, maxImageHeight)
                        .toFile(resizedImageFilePath , function(err){

                            if(err) throw err;

                            self.storeImage(ImageMediaObject, resizedImageFilePath, imageFileName, callback)

                        });
                } else {
                    self.storeImage(ImageMediaObject, imageFilePath, imageFileName, callback)
                }
            });
        }
    }
};