var mongoose = require('mongoose');

var MediaAsset = new mongoose.Schema({
	"type": String,
	"url": {
		type: String,
		required: false
	}
});

var MediaSceneSchema = new mongoose.Schema({
	name: String,
	scene: [MediaAsset],
});

module.exports = MediaSceneSchema;