'use strict';

const AZURE_CDN_TYPE = "azure";
const LOCAL_CDN_TYPE = "local";

var options = {
    port: process.env.PORT,
    account: process.env.AZURE_STORAGE_ACCOUNT,
    accessKey: process.env.AZURE_STORAGE_ACCESS_KEY,
    container: process.env.AZURE_STORAGE_CONTAINER,
    mongoConnection: process.env.MONGO_CONNECTION,
    localCDNHost: process.env.LOCAL_CDN_HOST,
    localCDNPort: process.env.LOCAL_CDN_PORT,
    localCDNRootDirectory: process.env.LOCAL_CDN_ROOT_FOLDER,
    cdnType: process.env.CDN_TYPE,

    // APEP some fixed values for testing
    CDN_TYPES: {
        AZURE_CDN_TYPE: AZURE_CDN_TYPE,
        LOCAL_CDN_TYPE: LOCAL_CDN_TYPE
    }
};

module.exports = options;