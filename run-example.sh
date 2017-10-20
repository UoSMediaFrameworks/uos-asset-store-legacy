#!/bin/bash

# CDN type specifies which storage should be used
export CDN_TYPE=azure

# Azure blob storage configuration
export AZURE_STORAGE_ACCOUNT=smaassetstore
export AZURE_STORAGE_ACCESS_KEY=someGiantLongAccessKey
export AZURE_STORAGE_CONTAINER=assetstoredev

# Local CDN storage configuration
export LOCAL_CDN_HOST=http://localhost
export LOCAL_CDN_PORT=9999
export LOCAL_CDN_ROOT_FOLDER=/cdn

# Database configuration
export MONGO_CONNECTION=mongodb://127.0.0.1:27017
# Port to use for nodejs server
export PORT=4000

$@