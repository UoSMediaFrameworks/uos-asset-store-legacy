'use strict';

var AssetStore = require('./src/asset-store.js');
var config = require('./config.js');

console.log("Config: ", config);

var store = new AssetStore(config);

store.listen();
