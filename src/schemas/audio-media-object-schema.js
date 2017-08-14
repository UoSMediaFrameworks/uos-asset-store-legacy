/**
 * Created by aaa48574 on 24/07/2017.
 */
/**
 * Created by aaronphillips on 01/11/2016.
 */
var mongoose = require('mongoose');
var crate = require('mongoose-crate');
var AzureBlobStorage = require('../azure-blob-storage');
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
    storage: new AzureBlobStorage({
        account: config.account,
        accessKey: config.accessKey,
        container: config.container
    }),
    fields: {
        audio: {}
    }
});

module.exports = AudioSchema;