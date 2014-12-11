'use strict';

var fs = require('fs');
var debug = require('debug')('xmp-parser');
var buffertools = require('buffertools');
var XmpError = require('./src/xmp-error');
var filePath = process.argv[2];//'test/banana.jpg';

// some buffers for searching file buffers
// http://partners.adobe.com/public/developer/en/xmp/sdk/XMPspecification.pdf#page=34
var xmpHeader = new Buffer('<?xpacket begin=', 'utf8');
var xmpTrailer = new Buffer('<?xpacket end=', 'utf8');
var xmpBeginUtf8 = new Buffer([0xEF, 0xBB, 0xBF]);
var xmpBeginUtf16BE = new Buffer([0xFE, 0xFF]);
var xmpBeginUtf16LE = new Buffer([0xFF, 0xFE]);
var xmpBeginUtf32BE = new Buffer([0x00, 0x00, 0xFE, 0xFF]);
var xmpBeginUtf32LE = new Buffer([0xFF, 0xFE, 0x00, 0x00]);

function findXMP (data) {
	// search for the header
	var headerIndex = buffertools.indexOf(data, xmpHeader);
	if (headerIndex > -1) {
		debug('xmp header found at byte ' + headerIndex);
		var trailerIndex = buffertools.indexOf(data, xmpTrailer, xmpHeader.length);
		// get the quote char used for begin
		var openQuoteCharIndex = headerIndex + xmpHeader.length;
		var quoteChar = data[openQuoteCharIndex];
		debug('quote character is ' + String.fromCharCode(quoteChar));
		// get the close quote
		var closeQuoteCharIndex = buffertools.indexOf(data, new Buffer([quoteChar], 'utf8'), openQuoteCharIndex + 1);
		if (closeQuoteCharIndex === -1) throw new XmpError('no close quote char for "begin" attribute');
		
		var packetEncoding;
		// if there is nothing inbetween then utf8 is assumed
		if (closeQuoteCharIndex - openQuoteCharIndex === 1) {
			debug('nothing in begin attr, defaulting to utf8');
			packetEncoding = 'utf8';
		} else {
			// get stuff between
			var beginAttr = data.slice(openQuoteCharIndex+1, closeQuoteCharIndex);
			if (buffertools.compare(beginAttr, xmpBeginUtf8) === 0) { // 0 means equal
				debug('begin attribute signifies utf8');
				packetEncoding = 'utf8';
			} else {
				throw new Error('xmp packet is not utf8, other encodings have not yet been implemented');
			}
		}

		debug('packet is encoded as ' + packetEncoding);
		
		if (trailerIndex === -1) {
			throw new XmpError('Invalid XMP: no trailer found in XMP packet.');
		}

		debug('xmp trailer found at byte ' + trailerIndex);

		var xmp = data.toString('utf8', headerIndex, trailerIndex);
		debug('xmp: ' + xmp);
	} else {
		throw new XmpError('no xmp header found in file');
	}
}

fs.readFile(filePath, function(err, data) {
	if (err) throw err;

	findXMP(data);
});