/**
 * Created by aaronphillips on 01/11/2016.
 */
var mongoose = require('mongoose');
var crate = require('mongoose-crate');
var AzureBlobStorage = require('../azure-blob-storage');
var config = require('../../config');

var VideoSchema = new mongoose.Schema({
    path: String,
    hasTranscoded: { type: Boolean, default: false},

    transcoder: Number, //simple odd or even for basic parallelisation of transcoding
    vimeoId: String,
    description: String,

    uploadedTimestamp: { type: Number, default: 0 },
    transcodedTimestamp:  { type: Number, default: 0 },
    transcodingStartedTimestamp: { type: Number, default: 0 }
});

VideoSchema.plugin(crate, {
    storage: new AzureBlobStorage({
        account: config.account,
        accessKey: config.accessKey,
        container: config.container
    }),
    fields: {
        video: {}
    }
});

module.exports = VideoSchema;