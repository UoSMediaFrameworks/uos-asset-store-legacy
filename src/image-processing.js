'use strict';

var sharp = require('sharp');
var async = require('async');

const thumbnailHeight = 90;
const maxImageHeight = 768;

module.exports = function () {
    return {

        storeImage: function (ImageMediaObject, imageFilePath, imageFileName, thumbnailFilePath, thumbnailFilename, resizedFilePath, resizedFileName, callback) {
            var imob = new ImageMediaObject();

            async.parallel([
                function (callback) {
                    imob.attach('image', { id: imob._id, path: imageFilePath, name: imageFileName }, callback);
                }, function (callback) {
                    imob.attach('thumbnail', { id: imob._id, path: thumbnailFilePath, name: thumbnailFilename }, callback);
                }, function (callback) {
                    imob.attach('resized', { id: imob._id, path: resizedFilePath, name: resizedFileName }, callback);
                }
            ], function (err, results) {

                if (err) return callback(err, null);

                imob.save(function (error) {
                    if (error) return callback(err, null);

                    callback(null, imob);
                });
            });

        },

        createNewImage: function (imageFilePath, imageFileName, newMaxHeight, newImageFilePath, newImageFileName, imageToUpload, callback) {
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

            imageToUpload
                .resize(undefined, newMaxHeight)
                .png()
                .toFile(newImageFilePath, function (err) {
                    callback(err);
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


            var thumbnailImageFilePath = imageFilePath + "-thumbnail";
            var thumbnailImageFileName = "thumbnail-" + imageFileName;

            var resizedImageFilePath = imageFilePath + "-resized";
            var resizedImageFileName = "resized-" + imageFileName;

            async.parallel([
                function (callback) {
                    self.createNewImage(imageFilePath, imageFileName, maxImageHeight, resizedImageFilePath, resizedImageFileName, imageToUpload, callback);
                }, function (callback) {
                    self.createNewImage(imageFilePath, imageFileName, thumbnailHeight, thumbnailImageFilePath, thumbnailImageFileName, imageToUpload, callback);
                }
            ], function (err, results) {

                // APEP TODO call back the error so we can inform the user we could not create new images
                if(err) throw err;

                self.storeImage(ImageMediaObject, imageFilePath, imageFileName, thumbnailImageFilePath, thumbnailImageFileName, resizedImageFilePath, resizedImageFileName, callback);
            });
        }
    }
};