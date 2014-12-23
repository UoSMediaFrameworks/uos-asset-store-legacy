'use strict';

var AssetStore = require('./src/asset-store');
var config = require('./config');

var store = new AssetStore(config);

store.listen();
