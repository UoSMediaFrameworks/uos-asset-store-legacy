var mongoose = require('mongoose');
var crate = require('mongoose-crate');
var LocalFS = require('mongoose-crate-localfs');
var AzureBlobStorage = require('../azure-blob-storage');
var config = require('../../config');

var ImageSchema = new mongoose.Schema({
	path: String,
	sceneId: String
});

ImageSchema.plugin(crate, {
	storage: new AzureBlobStorage({
		account: config.azureStorageAccount,
		accessKey: config.azureStorageAccessKey,
		container: config.azureStorageContainer
	}),
	fields: {
		image: {}
	}
});

module.exports = ImageSchema;