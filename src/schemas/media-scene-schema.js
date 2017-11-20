var mongoose = require('mongoose');
var VideoMediaObjectSchema = require('./video-media-object-schema');

var MediaAsset = new mongoose.Schema({
	"type": String,
	"url": {
		type: String,
		required: false
	},
	"vmob": {
		type: VideoMediaObjectSchema,
		required: false
	}
});
MediaAsset.set('validateBeforeSave', false);

var MediaSceneSchema = new mongoose.Schema({
	name: String,
	scene: [MediaAsset],
});
MediaSceneSchema.set('validateBeforeSave', false);

module.exports = MediaSceneSchema;