#!/bin/bash

export MONGO_CONNECTION=mongodb://localhost:27017/test-uos-mediahubdb
export PORT=4001
export LOCAL_CDN_HOST=http://localhost
export LOCAL_CDN_PORT=8090
export LOCAL_CDN_ROOT_FOLDER='C:/mediaframework/test2/cdn'

# CDN type specifies which storage should be used
export CDN_TYPE=local

$@