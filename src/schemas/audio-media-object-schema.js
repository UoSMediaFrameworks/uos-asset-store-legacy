/**
 * Created by aaa48574 on 24/07/2017.
 */
/**
 * Created by aaronphillips on 01/11/2016.
 */
var mongoose = require('mongoose');
var crate = require('mongoose-crate');
var AzureBlobStorage = require('../azure-blob-storage').AzureBlobStorage;
var LocalBlobStorage = require('../azure-blob-storage').LocalBlobStorage;
var config = require('../../config');

var AudioSchema = new mongoose.Schema({
    path: String,
    hasTranscoded: { type: Boolean, default: false},

    description: String,

    uploadedTimestamp: { type: String, default: "" },
    transcodedTimestamp:  { type: String, default: "" },
    transcodingStartedTimestamp: { type: String, default: "" }
});

AudioSchema.plugin(crate, {
    storage: new LocalBlobStorage(config),
    fields: {
        audio: {}
    }
});

module.exports = AudioSchema;