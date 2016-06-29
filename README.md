AssetStore
==========

Accept's image uploads, parses out any xmp tags, uploads the image to Azure blob storage, and returns the blob url and the parsed out tags


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
* ./run-example.sh mocha

