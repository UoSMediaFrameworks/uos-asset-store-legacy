'use strict';

module.exports = function() {
    return {
        storeVideo: function(VideoMediaObject, videoFilePath, videoFileName, callback) {
            console.log("Video Processing - storeVideo");

            var vmod = new VideoMediaObject(); //HAS ID AT THIS POINT

            vmod.attach('video', { id: vmod._id, path: videoFilePath, name: videoFileName }, function(error, result) {

                if (error) throw error;

                vmod.save(function(error) {
                    if (error) throw error;

                    callback(null, vmod);
                });

            });

        },

        storeVimeoVideo: function(VideoMediaObject, videoFilePath, videoFileName, videoName, vimeoId, transcoder, description, callback) {
            console.log("Video Processing - storeVimeoVideo[" +
                "videoFilePath: " + videoFilePath + ", " +
                "videoFileName: " + videoFileName + ", " +
                "vimeoId: " + vimeoId + ", " +
                "transcoder: " + transcoder + ", " +
                "description: " + description + "]");

            var vmod = new VideoMediaObject();
            
            vmod.vimeoId = vimeoId;
            vmod.transcoder = transcoder;
            vmod.description = description;


            vmod.attach('video', { id: vmod._id, path: videoFilePath, name: videoFileName }, function(error, result) {

                if (error) throw error;

                vmod.save(function(error) {
                    if (error) throw error;

                    callback(null, vmod);
                });

            });
            
        },

        uploadVideo: function(VideoMediaObject, videoFilePath, videoFileName, callback) {

            this.storeVideo(VideoMediaObject, videoFilePath, videoFileName, callback);
        }
    }
};