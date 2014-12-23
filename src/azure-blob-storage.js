'use strict';

var azureStorage = require('azure-storage');
var check = require('check-types');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var path = require('path');

var AzureBlobStorage = function(options) {
	EventEmitter.call(this);

	['account', 'accessKey', 'container'].forEach(function(key) {
		check.assert.string(options[key], key + ' is required.');
	});

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
	return util.format('https://%s.blob.core.windows.net/%s/%s', this._options.account, result.container, result.blob);
};


AzureBlobStorage.prototype.save = function(image, cb) {
	if (! this._blobSvc) {
		return this.on('connected', this.save.bind(this, image, cb));
	} else {
		this._blobSvc.createBlockBlobFromLocalFile(this._options.container, path.basename(image.path), image.path, function(error, result, response) {
            cb(error, error ? undefined : this._urlFromResult(result));
        }.bind(this));
	}
};

AzureBlobStorage.prototype.remove = function(image, cb) {
	throw 'not implemented';
};

module.exports = AzureBlobStorage;