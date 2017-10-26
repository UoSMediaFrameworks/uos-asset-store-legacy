AssetStore
==========

Accept's image uploads, parses out any xmp tags, uploads the image to Azure blob storage, and returns the blob url and the parsed out tags.

Accept's video uploads, via resumable api


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

Azure Deployment Notes
===========

IISNode.yml is specified to allow us to use a 64bit prebuild - checked in dependency
- This is a 64bit version of node

Nodejs and Azure web app deployment
===========

web.config is required to for iis to be configured in such as way to handle the hand over of requests to nodejs.

Samples of this file exist online

Without a web.config iis will attempt to match all routes, looking for static files.  Generally produces errors and 
iis errors can be found in the advanced web server error logs. 

