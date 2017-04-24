'use strict';

var sharp = require('sharp');
var async = require('async');

const thumbnailHeight = 90;
const maxImageHeight = 768;

module.exports = function () {
    return {

        // APEP Using mongoose and mongoose crate, use the attach function to add file details
        storeImage: function (ImageMediaObject, imageFilePath, imageFileName, callback) {
            var imob = new ImageMediaObject();

            // APEP ensure the file name is encoded for URI support
            imageFileName = encodeURIComponent(imageFileName);

            imob.attach('image', { id: imob._id, path: imageFilePath, name: imageFileName }, function(error, result) {
                if (error) throw error;

                imob.save(function (error) {
                    if (error) throw error;

                    callback(null, imob);
                });
            });
        },

        uploadThumbnailImage: function (ImageMediaObject, imageFilePath, imageFileName, imageToUpload, callback) {
            var self = this;
            var thumbnailImageFilePath = imageFilePath + "-thumbnail";
            var thumbnailImageFileName = "thumbnail-" + imageFileName;

            /*
             Angel Petrov 19/12/2016
             http://sharp.dimens.io/en/stable/api-output/
             toFile();
             If an explicit output format is not selected, it will be inferred from the extension, with JPEG, PNG, WebP, TIFF, DZI, and libvips' V format supported
             This was an issue when uploading gifs and svg images. Receiving an output format not supported error.
             I added the png function to the function chain that will give us jpeg output options and treat make the output format valid
             The final file will have a path and name that symbolises its source image but the actual type will be type/jpeg

                This problem will persist for the resized version of the image as well, and a resized gif will not indeed be animated
                as it will have a type of png or otherwise it will error

             */
            // APEP Maybe it's better if we change the extension to match the change been made (usage of .png())?

            imageToUpload
                .resize(undefined, thumbnailHeight)
                .png()
                .toFile(thumbnailImageFilePath, function (err) {
                    if (err) throw err;
                    self.storeImage(ImageMediaObject, thumbnailImageFilePath, thumbnailImageFileName, callback);
                });
        },

        getImageMetadata: function (imageToUpload, callback) {
            //meta data provides the data required for the requirements - size namely
            imageToUpload
                .metadata(function (err, metadata) {
                    if (err) throw err;

                    callback(metadata);
                });
        },

        uploadImage: function (ImageMediaObject, imageFilePath, imageFileName, imageToUpload, callback) {
            var self = this;
            async.parallel([
                function (callback) {
                    var resizedImageFilePath = imageFilePath + "-resized";
                    var resizedImageFileName = "resized-" + imageFileName;
                    imageToUpload
                        .resize(undefined, maxImageHeight)
                        .png()
                        .toFile(resizedImageFilePath, function (err) {
                            if (err) throw err;
                            self.storeImage(ImageMediaObject, resizedImageFilePath, resizedImageFileName, callback);
                        });
                }, function (callback) {
                    self.storeImage(ImageMediaObject, imageFilePath, imageFileName, callback);
                }
            ], function (err, results) {
                if (err) throw err;
                callback(results[1]);
            });
        }
    }
};