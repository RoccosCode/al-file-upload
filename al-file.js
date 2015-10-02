'use strict';

// module dependencies
var pathModule = require('path');
var promise = require('promise');
var args = require('optimist').argv;

// additional module dependencies
var logger = require('./logger');
var oauth = require('oauth-wrap');
var filesService = require('al-files-service');

// configuration
var config = require('./config');

function execute(operation, fileId) {
	if (!fileId) {
		logger.error('Invalid fileId detected', fileId);
		return;
	}
	var oauthRequest = config.oauthWrapRequest;
	// retrieve authorization
	oauth.getAuthHeader(oauthRequest.url,
            oauthRequest.creds.uid,
            oauthRequest.creds.pwd,
            oauthRequest.wrapScope)
		.then(function(authorization) {

			switch(operation) {
				case 'summary':
					filesService.getFile(config.filesApi.rootUrl, authorization, fileId)
		                .then(function(result) { logger.info(result); })
		                .catch(function(error) { logger.error('error uploading file: ', error.stack); });
	                break;
	            case 'records':
	            	filesService.getRecords(config.filesApi.rootUrl, authorization, fileId)
	            		.then(function(result) { logger.info(result); })
	            		.catch(function(error) { logger.error('error retrieving records: ', error.stack); });
	            	break;
	            default:
	            	logger.error('Invalid operation detected', operation);
	            	break;
            }
		})
		.catch(function(error) {
			logger.error('failed to obtain authorization: ', error.stack);
		});
}

// look for arguments
var operation = args.operation;
var fileId = args.fileId;

execute(operation, fileId);