'use strict';

module.exports = {
    port: process.env.PORT,
    azureStorageAccount: process.env.AZURE_STORAGE_ACCOUNT,
    azureStorageAccessKey: process.env.AZURE_STORAGE_ACCESS_KEY,
    azureStorageContainer: process.env.AZURE_STORAGE_CONTAINER,
    mongoConnection: process.env.MONGO_CONNECTION
};