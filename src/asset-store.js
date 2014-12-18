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

var AssetStore = function(ops, cb) {
    this._ops = ops;

    // setup mongo connection for sessions
    session.setClient(mongo.connect(ops.mongoConnection, ['sessions']));

    // make azure blob container
    this._blobSvc = azureStorage.createBlobService(ops.azureStorageAccount, ops.azureStorageAccessKey);

    this._blobSvc.createContainerIfNotExists(this._ops.azureStorageContainer, {publicAccessLevel: 'blob'}, function(error, result, response) {
        if (cb) {
            if (error) {
                cb(error);
            } else {
                cb();
            }
        } else if (error) {
            throw error;
        }
    }.bind(this));
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
    // init the container

    var app = express();
    
    this._server = http.Server(app);

    app.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    });

    app.use(bodyParser.urlencoded({ extended: false }));

    app.use(multer({
        dest: this._ops.uploadDir
    }));
    
    app.post('/upload/image', requireToken, routes.imageUpload(this._blobSvc, this._ops.azureStorageContainer));

    this._server.listen(this._ops.port, cb);

    
};

AssetStore.prototype.close = function(cb) {
    this._server.close(cb);
};

module.exports = function(ops, cb) {
    return new AssetStore(ops, cb);
};