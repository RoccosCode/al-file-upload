/**
*
* @module al-file-upload
* @description Supports a function to upload an input file to the AwardLetter Files API.
*
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
var ext = process.argv[3] == undefined ? 'txt' : process.argv[3];

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
	logger.debug('ext: ', ext);
	var errorMessage = null;
	if (!pathIsValid(path, errorMessage)) {
		logger.error(errorMessage);
		return;
	}

	// read contents of [file] path
	readFile(path)
		.then(function(content) {
			var contentObject = content;
			if (config.fileFormat === 'json') {
				try {
					// parse text as JSON
					contentObject = JSON.parse(content);
				} catch(e) { 
					logger.error('invalid json file detected: ', e.stack);
					return;
				}
			}
			var oauthRequest = config.oauthWrapRequest;
			// retrieve authorization
			oauth.getAuthHeader(oauthRequest.url,
                    oauthRequest.creds.uid,
                    oauthRequest.creds.pwd,
                    oauthRequest.wrapScope)
				.then(function(authorization) {
					logger.debug('authorization: ', authorization);

					// upload contents using AwardLetter Files API
					filesService.upload(config.filesApi.rootUrl, authorization, contentObject)
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