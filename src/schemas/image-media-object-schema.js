var mongoose = require('mongoose');
var crate = require('mongoose-crate');
var LocalBlobStorage = require('../azure-blob-storage').LocalBlobStorage;
var AzureBlobStorage = require('../azure-blob-storage').AzureBlobStorage;
var config = require('../../config');

var ImageSchema = new mongoose.Schema({
	path: String,
	sceneId: String,
	image: Object,
	thumbnail: Object,
	resized: Object
});

ImageSchema.plugin(crate, {
    // APEP the storage is configuration based, we fall back to Azure as it's our most common
    // APEP this approach will change in the future
    storage: config.cdnType === config.CDN_TYPES.LOCAL_CDN_TYPE ? new LocalBlobStorage(config) : AzureBlobStorage.instance(config),
	fields: {
		image: {},
		thumbnail: {},
		resized: {}
	}
});

module.exports = ImageSchema;