'use strict';


var options = {
    port: process.env.PORT,
    account: process.env.AZURE_STORAGE_ACCOUNT,
    accessKey: process.env.AZURE_STORAGE_ACCESS_KEY,
    container: process.env.AZURE_STORAGE_CONTAINER,
    mongoConnection: process.env.MONGO_CONNECTION,
    localCDNHost: process.env.LOCAL_CDN_HOST,
    localCDNPort: process.env.LOCAL_CDN_PORT,
    localCDNRootDirectory: process.env.LOCAL_CDN_ROOT_FOLDER
};

module.exports = options;