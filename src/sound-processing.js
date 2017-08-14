'use strict';
var util = require('util');
var moment = require('moment');

module.exports = function() {
    return {
        storeAudio: function(AudioMediaObject, audioFilePath, audioFileName, callback) {
            console.log("Audio Processing - storeAudio");

            var amod = new AudioMediaObject(); // APEP an ID is set during constructor

            // APEP Set a timestamp for the final upload time
            amod.uploadedTimestamp = moment.utc();

            amod.attach('audio', { id: amod._id, path: audioFilePath, name: audioFileName }, function(error, result) {

                if (error) throw error;

                amod.save(function(error) {
                    if (error) throw error;

                    callback(null, amod);
                });

            });

        }
    }
};