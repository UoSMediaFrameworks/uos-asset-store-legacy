'use strict';

var AssetStore = require('./src/asset-store.js');
var config = require('./config.js');

var store = new AssetStore(config);

store.listen();
