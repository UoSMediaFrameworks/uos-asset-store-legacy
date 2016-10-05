var mongoose = require('mongoose');
var crate = require('mongoose-crate');
var AzureBlobStorage = require('../azure-blob-storage');
var config = require('../../config');

var ImageSchema = new mongoose.Schema({
	path: String,
	sceneId: String
});

ImageSchema.plugin(crate, {
	storage: new AzureBlobStorage({
		account: config.account,
		accessKey: config.accessKey,
		container: config.container
	}),
	fields: {
		image: {}
	}
});

module.exports = ImageSchema;