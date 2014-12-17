'use strict';

var azureStorage = require('azure-storage');
var objectAssign = require('object-assign');
var express = require('express');
var http = require('http');
var multer = require('multer');
var bodyParser = require('body-parser');
var mongo = require('mongojs');

var routes = require('./routes');
var session = require('./session');

var AssetStore = function(ops) {
    this._ops = ops;

    session.setClient(mongo.connect(ops.mongoConnection, ['sessions']));
};

function requireToken(req, res, next) {
    if ( req.body.token ) {
        session.find(req.body.token, function(err, data) {
            if (err) throw err;

            if (data) {
                next();
            } else {
                res.sendStatus(401);
            }
        });
    } else {
        res.sendStatus(401);
    }
}

AssetStore.prototype.listen = function(cb) {
    var app = express();
    
    this._server = http.Server(app);

    app.use(bodyParser.urlencoded({ extended: false }));

    app.use(multer({
        dest: this._ops.uploadDir
    }));
    
    app.post('/upload/image', requireToken, routes.imageUpload({
        storageAccount: this._ops.azureStorageAccount,
        accessKey: this._ops.azureStorageAccessKey,
        storageContainer: this._ops.azureStorageContainer
    }));

    this._server.listen(this._ops.port, cb);
};

AssetStore.prototype.close = function(cb) {
    this._server.close(cb);
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