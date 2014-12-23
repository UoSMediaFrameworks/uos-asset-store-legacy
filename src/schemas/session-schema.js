var mongoose = require('mongoose');

var SessionSchema = new mongoose.Schema({
	created: { type: Date, default: Date.now }
});

module.exports = SessionSchema;