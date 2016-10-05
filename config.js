'use strict';


var options = {
    port: process.env.PORT,
    account: process.env.AZURE_STORAGE_ACCOUNT,
    accessKey: process.env.AZURE_STORAGE_ACCESS_KEY,
    container: process.env.AZURE_STORAGE_CONTAINER,
    mongoConnection: process.env.MONGO_CONNECTION
};

module.exports = options;