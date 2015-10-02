/**
*
* @module al-file-upload
* @description Supports a function to upload an input file to the AwardLetter Files API.
****
*### Environment Requirements:
*
** Internet access (port 80 and SSL over port 5443).
** Node.js installed.
*
*### Installing directly from github:
*
*Clone or download as zip to local machine. For the later, unzip to desired location.
*In a command prompt at the root installation directory, execute the following command
* to install all module dependencies:
*
*		>npm install
*
*### Configuration:
*
*All configuration is contained within the config.json file.
*
***Logging:** The module is configured to log to a _logs_ folder within the root directory of the application.
*Standard log entries will be written to a file named alfilesystemwatcher.log while unhandled exceptions will
*be logged to a file named alfilesystemwatchererrors.log.
*
*       "logging" : { "directory" : "./logs" }
*
***Authorization:** The upload process requires an authorization token from a secure token service(STS).
*
*       "oauthWrapRequest" : { "url":"sts_url", "creds":{"uid":"userid", "pwd":"password"}, "wrapScope":"scope" }
*
*The following values must be provided in order to invoke the STS and acquire an authorization token:
*
*JSON Element | Description
*-------------|--------------------------------------------------------------------------
*url | The STS URL
*creds.userid | User Id
*creds.pwd | User password
*wrapScope | The resource that will be accessed using the authorization token.
*
***AwardLetter Files API:** Defines the root URL of the AwardLetter Files API. This API defines a method
*for uploading AwardLetter input file content.
*
*       "filesApi" : { "rootUrl" : "root_url" }
*
***File Format:** The file format being uploaded. Expected values include "txt" and "json".
*
*       "fileFormat" : "txt"
*
*###Running al-file-upload:
*
*Execute manually by opening a command prompt at the installation root directory:
*
*		>node al-file-upload.js [filepath]
*	
*Examples:
*
*		>node al-file-upload.js c:\temp\input.txt
*		>node al-file-upload.js 'c:\input files\input file.json'
*/
'use strict';

// module dependencies
var pathModule = require('path');
var promise = require('promise');

var fs = require('fs');

// coerce fs to return promises
var readFile = promise.denodeify(require('fs').readFile);

// additional module dependencies
var logger = require('./logger');
var oauth = require('oauth-wrap');
var filesService = require('al-files-service');

// configuration
var config = require('./config');

// look for arguments
var path = process.argv[2];

function pathIsValid(path, errorMessage) {
	try {
		var stats = fs.lstatSync(path);
		if (!stats.isFile()) {
			var errorMessage = 'Path did not resolve to a file: ' + path;
			logger.warn(errorMessage);			
			return false;
		}
		return true;
	} catch(e) {
		var errorMessage = 'Invalid path detected: ', path;
		logger.warn(errorMessage + '; error: ' + e.stack);
		return false;
	}
}

function upload() {
	logger.debug('path: ', path);
	var errorMessage = null;
	if (!pathIsValid(path, errorMessage)) {
		logger.error(errorMessage);
		return;
	}

	// read contents of [file] path
	readFile(path, {encoding: 'utf8'})
		.then(function(content) {
			//logger.debug(content);
			var oauthRequest = config.oauthWrapRequest;
			// retrieve authorization
			oauth.getAuthHeader(oauthRequest.url,
                    oauthRequest.creds.uid,
                    oauthRequest.creds.pwd,
                    oauthRequest.wrapScope)
				.then(function(authorization) {
					logger.debug('authorization: ', authorization);

					// upload contents using AwardLetter Files API
					filesService.upload(config.filesApi.rootUrl, authorization, content)
                        .then(function(result) { 
                        	// results can be written to file, database, or 
                            logger.info('upload succeeded: ', result);
                        })
                        .catch(function(error) {
                            logger.error('error uploading file: ', error.stack);
                        });
				})
				.catch(function(error) {
					logger.error('failed to obtain authorization: ', error.stack);
				});
		})
		.catch(function(error){ 
			logger.error('failed to read file: ', path, '; error: ', error.stack);
		});
}

upload();