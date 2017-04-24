'use strict';

var azureStorage = require('azure-storage');
var check = require('check-types');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var url = require('url');
var path = require('path');

var AzureBlobStorage = function(options) {
	EventEmitter.call(this);

	//['account', 'accessKey', 'container'].forEach(function(key) {
	//	check.assert.string(options[key], key + ' is required.');
	//});

	this._options = options;

	// try to make azure blob container
	var blobSvc = azureStorage.createBlobService(options.account, options.accessKey);
	blobSvc.createContainerIfNotExists(options.container, {publicAccessLevel: 'blob'}, function(error, result, response) {
		if (error) {
			throw error;
		} else {
			this._blobSvc = blobSvc;
			this.emit('connected');
		}
	}.bind(this));
};

util.inherits(AzureBlobStorage, EventEmitter);

AzureBlobStorage.prototype._urlFromResult = function(result) {
    //APEP chunk upload results from blob storage do not work with this method
	return util.format('https://%s.blob.core.windows.net/%s/%s', this._options.account, result.container, result.name);
};

AzureBlobStorage.prototype._urlPartial = function(mediaForStoragePath) {
	return util.format('https://%s.blob.core.windows.net/%s/', this._options.account, this._options.container) + mediaForStoragePath;
};

AzureBlobStorage.prototype.save = function(media, cb) {
	if (! this._blobSvc) {
		return this.on('connected', this.save.bind(this, media, cb));
	} else {

		var mediaForStoragePath;
		// APEP TODO - Consideration for team - some badly created videos are marked as type application/octet-stream, causing the below to use image url generation logic for videos
		if(media.type.startsWith("video")) {
			mediaForStoragePath = "video/raw/" + media.id + "/" + media.name;
		} else {
			mediaForStoragePath = media.id + "/" + media.name;
		}
		this._blobSvc.createBlockBlobFromLocalFile(this._options.container, mediaForStoragePath, media.path, function(error, result, response) {

			console.log("result: ", result);
			console.log("response: ", response);

			cb(error, error ? undefined : this._urlPartial(mediaForStoragePath));
		}.bind(this));
	}
};

AzureBlobStorage.prototype.remove = function(image, cb) {
	if (! this._blobSvc) {
		return this.on('connected', this.remove.bind(this, image, cb));
	} else {
		// get the blob name from the url
		var blobName = url.parse(image.url).path.match(/\/\w+\/(.*)/)[1];
		console.log('deleting blob ' + blobName);
		this._blobSvc.deleteBlob(this._options.container, blobName, function(error, response) {
			// muffle any 404s, not a big deal if we are trying to remove something and it isn't there!
			cb(response.statusCode === 404 ? null : error);
		});
	}
};

module.exports = AzureBlobStorage;