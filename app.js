'use strict';

var assetStore = require('./src/asset-store');
var config = require('./config');

var store = assetStore(config);

store.listen();
