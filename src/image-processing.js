'use strict';

var sharp = require('sharp');

const thumbnailHeight = 90;

var ImageProcessing = function() {
};

ImageProcessing.prototype.getImageMetadata = function(imageToUpload, callback){
    console.log("The details of the image being uploaded");

    //meta data provides the data required for the requirements - size namely
    imageToUpload
        .metadata(function(err, metadata){
            if(err) throw err;
            console.log("Image Uploading Metadata:", metadata);
            callback(metadata);
        });
};

//TODO - I'm thinking for this particularly issue, we should use thumbnail at start of image name rather than end //TODO consider some unit tests?
ImageProcessing.prototype.uploadThumbnailImage = function(ImageMediaObject, imageFilePath, imageFileName, imageToUpload, callback) {
    var thumbnailImob = new ImageMediaObject();
    var thumbnailImageFilePath = imageFilePath + "-thumbnail.jpg";
    var thumbnailImageFileName = imageFileName + "-thumbnail.jpg";
    imageToUpload
        .resize(undefined, thumbnailHeight)
        .toFile(thumbnailImageFilePath, function(err) {

            if(err) throw err;

            thumbnailImob.attach('image', {path: thumbnailImageFilePath, name: thumbnailImageFileName }, function(error, result) {
                if (error) throw error;

                thumbnailImob.save(function(error) {
                    if (error) throw error;

                    callback();
                });
            });
        });
};

ImageProcessing.prototype.saveImage = function(ImageMediaObject, imageToUpload, callback) {

    this.getImageMetadata(imageToUpload, function(metaData){
        
    });

    callback();
};

module.exports = function() {
    return {
        uploadThumbnailImage: function(ImageMediaObject, imageFilePath, imageFileName, imageToUpload, callback) {
            var thumbnailImob = new ImageMediaObject();
            var thumbnailImageFilePath = imageFilePath + "-thumbnail.jpg";
            var thumbnailImageFileName = imageFileName + "-thumbnail.jpg";
            imageToUpload
                .resize(undefined, 90)
                .toFile(thumbnailImageFilePath, function(err) {

                    if(err) throw err;

                    thumbnailImob.attach('image', {path: thumbnailImageFilePath, name: thumbnailImageFileName }, function(error, result) {
                        if (error) throw error;

                        thumbnailImob.save(function(error) {
                            if (error) throw error;

                            callback();
                        });
                    });
                });
        }
    }
};