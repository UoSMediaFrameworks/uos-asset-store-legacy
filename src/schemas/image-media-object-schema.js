var mongoose = require('mongoose');
var crate = require('mongoose-crate');
var LocalBlobStorage = require('../azure-blob-storage').LocalBlobStorage;
var AzureBlobStorage = require('../azure-blob-storage').AzureBlobStorage;
var config = require('../../config');

var ImageSchema = new mongoose.Schema({
	path: String,
	sceneId: String
});

ImageSchema.plugin(crate, {
	storage: new LocalBlobStorage(config),
	fields: {
		image: {},
		thumbnail: {},
		resized: {}
	}
});

module.exports = ImageSchema;