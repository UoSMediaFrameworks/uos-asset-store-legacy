'use strict';

var azureStorage = require('azure-storage');
var check = require('check-types');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var url = require('url');
var path = require('path');
var fs = require('fs-extra');

class MediaBlobStore extends EventEmitter {

	constructor(options) {
		super();

        this._options = options;
	}

    save(media, cb) {
		console.log("Generic MediaBlobStore - save - Override");
	}

	remove(media, cb) {
        console.log("Generic MediaBlobStore - remove - Override");
	}
}

var _instance = null;

class AzureBlobStorage extends MediaBlobStore {

    static get _instance() {
        return _instance;
    };

    static set _instance(val) {
        _instance = val;
    }

    // APEP allow us to use a single Azure Blob Storage connection for each runtime of this application
    static instance (config) {
        if (!AzureBlobStorage._instance) {
            AzureBlobStorage._instance = new AzureBlobStorage(config);
        }

        return AzureBlobStorage._instance;
    };

	constructor(options) {
		super(options);

        //['account', 'accessKey', 'container'].forEach(function(key) {
        //	check.assert.string(options[key], key + ' is required.');
        //});

        // try to make azure blob container
        // var emulatorConnectionString="DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://192.168.0.15:10000/devstoreaccount1;";
        // var blobSvc = azureStorage.createBlobService(emulatorConnectionString);

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
	}

    _urlFromResult(result) {
		//APEP chunk upload results from blob storage do not work with this method
		return util.format('https://%s.blob.core.windows.net/%s/%s', this._options.account, result.container, result.name);
	}

    _urlPartial(mediaForStoragePath) {
        return util.format('https://%s.blob.core.windows.net/%s/', this._options.account, this._options.container) + mediaForStoragePath;
    }

    _getStoragePathForMedia(media) {
        if(media.type.startsWith("video")) {
            return "video/raw/" + media.id + "/" + media.name;
        } else if (media.type.startsWith("audio")) {
            return "audio/raw/" + media.id + "/" + media.name;
        } else {
            return media.id + "/" + media.name;
        }
    }

    save(media, cb) {
        if (! this._blobSvc) {
            return this.on('connected', this.save.bind(this, media, cb));
        } else {

            var mediaForStoragePath = this._getStoragePathForMedia(media);

            this._blobSvc.createBlockBlobFromLocalFile(this._options.container, mediaForStoragePath, media.path, function(error, result, response) {
                cb(error, error ? undefined : this._urlPartial(mediaForStoragePath));
            }.bind(this));
        }
    }

    remove(image, cb) {
        if (! this._blobSvc) {
            return this.on('connected', this.remove.bind(this, image, cb));
        } else {
            // APEP TODO Do media type dependent remove.  The below will not work for any of our media types anymore.

            // APEP We should also move to deleting the folders, as then all the media for this mediaobject id is removed
            // For example, image folder has 3 media and video n number of media.  Removing the folder is the best cleaning strategy

            // get the blob name from the url
            var blobName = url.parse(image.url).path.match(/\/\w+\/(.*)/)[1];
            console.log('deleting blob ' + blobName);
            this._blobSvc.deleteBlob(this._options.container, blobName, function(error, response) {
                // muffle any 404s, not a big deal if we are trying to remove something and it isn't there!
                cb(response.statusCode === 404 ? null : error);
            });
        }
    }
}

class LocalBlobStorage extends MediaBlobStore {

    constructor(options) {
		super(options);

		this.emit('connected');
	}

    _localUrl(mediaForStoragePath) {
        return util.format('%s:%s/', this._options.localCDNHost, this._options.localCDNPort) + mediaForStoragePath;
    }

    _getStoragePathForMedia(media) {
        if(media.type.startsWith("video")) {
            return "video/raw/" + media.id + "/" + media.name;
        } else if (media.type.startsWith("audio")) {
            return "audio/raw/" + media.id + "/" + media.name;
        } else {
            return media.id + "/" + media.name;
        }
    }

    save(media, cb) {
        var relativeMediaForStoragePath = this._getStoragePathForMedia(media);
		var mediaForStoragePath = this._options.localCDNRootDirectory + "/" + relativeMediaForStoragePath;
		console.log("LocalBlobStorage - save - mediaForStoragePath: ", mediaForStoragePath);
        fs.copy(media.path, mediaForStoragePath, function(err) {
            cb(err, err ? undefined : this._localUrl(relativeMediaForStoragePath));
        }.bind(this));
    }

    remove(image, cb) {
		// get the blob name from the url
		var blobName = url.parse(image.url).path.match(/\/\w+\/(.*)/)[1];

		// APEP TODO implement remove

		// console.log('deleting blob ' + blobName);
		// this._blobSvc.deleteBlob(this._options.container, blobName, function(error, response) {
			// muffle any 404s, not a big deal if we are trying to remove something and it isn't there!
			// cb(response.statusCode === 404 ? null : error);
		// });
    }
}

module.exports.AzureBlobStorage = AzureBlobStorage;
module.exports.LocalBlobStorage = LocalBlobStorage;