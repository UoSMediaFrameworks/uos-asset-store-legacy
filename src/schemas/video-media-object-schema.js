/**
 * Created by aaronphillips on 01/11/2016.
 */
var mongoose = require('mongoose');
var crate = require('mongoose-crate');
var AzureBlobStorage = require('../azure-blob-storage');
var config = require('../../config');

var VideoSchema = new mongoose.Schema({
    path: String,
    hasTranscoded: { type: Boolean, default: false}
    
    //TODO add into schema with defaults for other video properties we want to deal with
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