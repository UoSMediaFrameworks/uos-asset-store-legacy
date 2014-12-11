'use strict';

function XMPError (message) {
	this.message = message;
}

XMPError.prototype = new Error();

module.exports = XMPError;