AssetStore
==========

Accept's image uploads, via resumable api, parses out any xmp tags, uploads the image to Azure blob storage, and returns the blob url and the parsed out tags.

Accept's video uploads, via resumable api

Accept's audio uploads, via resumable api


Getting Started
==========

npm install


Create a run script: cp ./run-example.sh ./run.sh
* Ensure configuration is correct
** Updating AZURE_STORAGE values
* Make executable: chmod 775 run.sh


Run server: ./run.sh node app.js


Integration Tests
==========

Ensure npm module mocha is installed globally
* npm install -g mocha

Update run script with appropriate variables for test environment

Run Tests (This will run all tests found that are suitable for mocha)
```bash
./run-example.sh mocha
```

Actual Run Tests script
```bash
./test-run.sh mocha test/integration-tests.js
```

Check test-run script, must run a local mongodb and create the dir path for LOCAL_CDN_ROOT_FOLDER otherwise tests that save media to disk will fail

Azure Deployment Notes
===========

IISNode.yml is specified to allow us to use a 64bit prebuild - checked in dependency
- This is a 64bit version of node


