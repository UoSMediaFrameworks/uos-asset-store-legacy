'use strict';

var azureStorage = require('azure-storage');
var objectAssign = require('object-assign');
var express = require('express');
var http = require('http');
var multer = require('multer');
var handlers = require('./handlers');

var AssetStore = function(ops) {
    this._ops = ops;
};


AssetStore.prototype.listen = function(cb) {
    var app = express(),
        server = http.Server(app);

    app.use(multer({
        dest: this._ops.uploadDir
    }));

    app.get('/', handlers.hello);
    app.post('/upload/image', handlers.imageUpload);

    server.listen(this._ops.port, cb);
};

module.exports = function(ops) {
    return new AssetStore(ops);
};

// var config = {
//  AZURE_STORAGE_ACCOUNT: process.env.AZURE_STORAGE_ACCOUNT,
//  AZURE_STORAGE_ACCESS_KEY: process.env.AZURE_STORAGE_ACCESS_KEY
// };

// try {
//  var externalConfig = require('./config');
//  config = objectAssign(config, externalConfig);
// } catch (e) {
//  // config.js file is optional, so just proceed grabbing config from process.env
// }

// var blobSvc = azureStorage.createBlobService(config.AZURE_STORAGE_ACCOUNT, config.AZURE_STORAGE_ACCESS_KEY);

// blobSvc.createContainerIfNotExists('assetstore', {publicAccessLevel: 'blob'}, function(error, result, response) {
//  if (error) {
//      throw error;
//  }
// });