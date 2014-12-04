'use strict';

var azureStorage = require('azure-storage');
var objectAssign = require('object-assign');

var config = {
	AZURE_STORAGE_ACCOUNT: process.env.AZURE_STORAGE_ACCOUNT,
	AZURE_STORAGE_ACCESS_KEY: process.env.AZURE_STORAGE_ACCESS_KEY
};

try {
	var externalConfig = require('./config');
	config = objectAssign(config, externalConfig);
} catch (e) {
	// config.js file is optional, so just proceed grabbing config from process.env
}

var blobSvc = azureStorage.createBlobService(config.AZURE_STORAGE_ACCOUNT, config.AZURE_STORAGE_ACCESS_KEY);

blobSvc.createContainerIfNotExists('assetstore', {publicAccessLevel: 'blob'}, function(error, result, response) {
	if (error) {
		throw error;
	}


});