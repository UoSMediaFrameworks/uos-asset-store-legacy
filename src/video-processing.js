'use strict';
var util = require('util');
var moment = require('moment');

function getUrl(videoUrl) {
    return util.format('https://%s.blob.core.windows.net/%s/%s', "uosassetstore", "assetstoredev", videoUrl);
}

module.exports = function() {
    return {

        /**
         * Store the video media object in both azure and the database
         */
        storeVideo: function(VideoMediaObject, videoFilePath, videoFileName, callback) {
            console.log("Video Processing - storeVideo");

            var vmod = new VideoMediaObject(); // APEP an ID is set during constructor

            // APEP Set a timestamp for the final upload time
            vmod.uploadedTimestamp = moment.utc();

            vmod.attach('video', { id: vmod._id, path: videoFilePath, name: videoFileName }, function(error, result) {

                if (error) throw error;

                vmod.save(function(error) {
                    if (error) throw error;

                    callback(null, vmod);
                });

            });

        },

        /**
         * Function written for the batch vimeo videos that have been ported from vimeo to our system
         */
        storeVimeoVideo: function(VideoMediaObject, videoFileName, videoName, vimeoId, transcoder, description, size, callback) {
            console.log("Video Processing - storeVimeoVideo[" +
                "videoFileName: " + videoFileName + ", " +
                "vimeoId: " + vimeoId + ", " +
                "transcoder: " + transcoder + ", " +
                "description: " + description + "]");

            var vmod = new VideoMediaObject();
            
            vmod.vimeoId = vimeoId;
            vmod.transcoder = transcoder;
            vmod.description = description;

            vmod.video.name = videoFileName;
            vmod.video.type = "video/mp4";
            vmod.video.size = size;
            vmod.video.url = getUrl("video/raw/" + vmod.id + "/" + encodeURIComponent(vmod.video.name));

            vmod.save(function(error) {
                if (error) throw error;

                callback(null, vmod);
            });
            
        },

        upload: function(VideoMediaObject, videoFilePath, videoFileName, callback) {
            this.storeVideo(VideoMediaObject, videoFilePath, videoFileName, callback);
        }
    }
};