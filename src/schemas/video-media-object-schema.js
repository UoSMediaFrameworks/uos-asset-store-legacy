var mongoose = require('mongoose');
var crate = require('mongoose-crate');
var AzureBlobStorage = require('../azure-blob-storage').AzureBlobStorage;
var LocalBlobStorage = require('../azure-blob-storage').LocalBlobStorage;
var config = require('../../config');

var VideoSchema = new mongoose.Schema({
    path: String,
    hasTranscoded: { type: Boolean, default: false},

    transcoder: Number, //simple odd or even for basic parallelisation of transcoding
    vimeoId: String,
    description: String,

    uploadedTimestamp: { type: String, default: "" },
    transcodedTimestamp:  { type: String, default: "" },
    transcodingStartedTimestamp: { type: String, default: "" },
    video: Object // APEP we could look at describing this using the crate plugin.
});

VideoSchema.plugin(crate, {
    // APEP the storage is configuration based, we fall back to Azure as it's our most common
    // APEP this approach will change in the future
    storage: config.cdnType === config.CDN_TYPES.LOCAL_CDN_TYPE ? new LocalBlobStorage(config) : AzureBlobStorage.instance(config),
    fields: {
        video: {}
    }
});

module.exports = VideoSchema;