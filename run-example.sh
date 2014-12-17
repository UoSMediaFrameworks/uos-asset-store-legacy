#!/bin/bash

export AZURE_STORAGE_ACCOUNT=smaassetstore
export AZURE_STORAGE_ACCESS_KEY=someGiantLongAccessKey
export AZURE_STORAGE_CONTAINER=assetstoredev
export MONGO_CONNECTION=mongodb://127.0.0.1:27017
export PORT=4000

$@