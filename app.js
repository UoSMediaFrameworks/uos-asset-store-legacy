'use strict';

var assetStore = require('./src/asset-store');
var store = assetStore({port: process.env.PORT || 4000});

store.listen();
