var mongoose = require('mongoose');

var MediaAsset = new mongoose.Schema({
	"type": String,
	"url": {
		type: String,
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