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

    uploadedTimestamp: { type: String, default: "" },
    transcodedTimestamp:  { type: String, default: "" },
    transcodingStartedTimestamp: { type: String, default: "" }
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