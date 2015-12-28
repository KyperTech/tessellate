/**
 * @description Application Controller
 */


import _ from 'lodash';
import logger from '../utils/logger';
import { Application } from '../models/application';
import { Account } from '../models/account';
import { Group } from '../models/group';
import authUtil from '../utils/auth';
/**
 * @api {get} /applications Get Application(s)
 * @apiDescription Get a specific application's data or a list of applications.
 * @apiName GetApplication
 * @apiGroup Application
 *
 * @apiParam {String} [name] Name of Application.
 *
 * @apiSuccess {object} applicationData Object containing applications data if <code>name</code> param is provided
 * @apiSuccess {array} applications Array of applications if <code>name</code> is not provided.
 *

 * @apiSuccessExample Success-Response (No Name Provided):
 *     HTTP/1.1 200 OK
 *     [
 *      {
 *       name: "exampleApp",
 *       owner: {username:"hackerguy1", email:"test@test.com", name:"John Doe"},
 *       frontend:{bucketName:"tessellate-exampleApp", provider:"Amazon", siteUrl:"tessellate-exampleApp.s3website.com"},
 *       createdAt:1438737438578,
 *       updatedAt:1438737438578
 *      },
 *       name: "testApp",
 *       owner: {username:"hackerguy1", email:"test@test.com", name:"John Doe"},
 *       frontend:{bucketName:"tessellate-testApp", provider:"Amazon", siteUrl:"tessellate-testApp.s3website.com"},
 *       createdAt:1438737438578,
 *       updatedAt:1438737438578
 *      }
 *     ]
 * @apiSuccessExample Success-Response (Name Provided):
 *     HTTP/1.1 200 OK
 *     {
 *       name: "exampleApp",
 *       owner: {username:"hackerguy1", email:"test@test.com", name:"John Doe"},
 *       frontend:{bucketName:"tessellate-exampleApp", provider:"Amazon", siteUrl:"tessellate-exampleApp.s3website.com"},
 *       createdAt:1438737438578,
 *       updatedAt:1438737438578
 *     }
 * @apiErrorExample  Error-Response (Not Found):
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "message":"Application not found."
 *     }
 */

export function get(req, res, next) {
	// let user = authUtil.getUserFromRequest(req);
	// logger.log({description: 'User from request.', user: user, func: 'get', obj: 'ApplicationsCtrls'});
	let isList = true;
	let findObj = {};
	let query;
	if(req.params.name){ //Get data for a specific application
		logger.log({
			description: 'Application get request.', name: req.params.name,
			func: 'get', obj: 'ApplicationsCtrls'
		});
		findObj.name = req.params.name;
		isList = false;
		query = Application.findOne(findObj).populate({path:'owner', select:'username name email'})
		.populate({path:'collaborators', select:'username name email'})
		.populate({path:'groups', select:'name accounts'});
	} else {
		//Find applications that current user as owner or as a collaborator
		if(req.user){
			findObj.$or = [{'owner': req.user.accountId}, {'collaborators': {$in:[req.user.accountId]}}]
		}
		query = Application.find(findObj).populate({path:'owner', select:'username name email'})
		.populate({path:'collaborators', select:'username name email'})
		.populate({path:'groups', select:'name accounts'});
	}
	logger.log({
		description: 'Get find object created.', findObj: findObj,
		func: 'get', obj: 'ApplicationsCtrls'
	});
	query.then((result) => {
		if(!result){
			logger.error({
				description: 'Error finding Application(s).',
				func: 'get', obj: 'ApplicationsCtrls'
			});
			return res.status(400).send('Application(s) could not be found.');
		}
		logger.log({
			description: 'Application(s) found.',
			func: 'get', obj: 'ApplicationsCtrls'
		});
		res.send(result);
	}, (err) => {
		logger.error({
			description: 'Error getting application(s):',
			error: err, func: 'get', obj: 'ApplicationsCtrls'
		});
		res.status(500).send('Error getting Application(s).');
	});
};
/**
 * @api {get} /applications Get Application's provider data
 * @apiDescription Get a specific application's data or a list of applications.
 * @apiName GetApplication
 * @apiGroup Application
 *
 * @apiParam {String} [name] Name of Application.
 *
 * @apiSuccess {object} applicationData Object containing applications data if <code>name</code> param is provided
 * @apiSuccess {array} applications Array of applications if <code>name</code> is not provided.
 *
 */
export function getProviders(req, res, next) {
	if(!req.params.name){ //Get data for a specific application
		logger.warn({
			description: 'Application name required to get providers.',
			func: 'getProviders', obj: 'ApplicationsCtrls'
		});
		return res.status(400).send('Application name required to get providers.');
	}
	logger.log({
		description: 'Get Providers request.', params: req.params,
		func: 'getProviders', obj: 'ApplicationsCtrls'
	});
	let query = Application.findOne({name:req.params.name});
	query.then((result) => {
		if(!result){
			logger.warn({
				description: 'Application not found.',
				func: 'getProviders', obj: 'ApplicationsCtrls'
			});
			return res.status(400).send('Application could not be found.');
		}
		let providerData = {};
		_.each(result.providers, (provider) => {
			providerData[provider.name] = provider.clientId;
		});
		logger.log({
			description: 'Provider data found.', providerData: providerData,
			func: 'getProviders', obj: 'ApplicationsCtrls'
		});
		res.send(providerData);
	}, (err) => {
		logger.error({
			description: 'Error getting application(s).',
			error: err, func: 'getProviders', obj: 'ApplicationsCtrls'
		});
		res.status(500).send('Error getting Application(s).');
	});
};

/**
 * @api {post} /applications Add Application
 * @apiDescription Add a new application.
 * @apiName AddApplication
 * @apiGroup Application
 *
 * @apiParam {String} name Name of application
 * @apiParam {String} [template] Template to use when creating the application. Default template is used if no template provided
 *
 * @apiSuccess {Object} applicationData Object containing newly created applications data.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       name: "exampleApp",
 *       owner: {username:"hackerguy1", email:"test@test.com", name:"John Doe"},
 *       frontend:{bucketName:"tessellate-exampleApp", provider:"Amazon", siteUrl:"tessellate-exampleApp.s3website.com"},
 *       createdAt:1438737438578,
 *       updatedAt:1438737438578
 *     }
 *
 * @apiErrorExample  Error-Response (Already Exists):
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "message":"Application by that name already exists."
 *     }
 *
 */
export function add(req, res, next) {
	//Query for existing application with same _id
	if(!_.has(req.body, "name")){
		logger.error({
			description:'Application name required to create a new app.',
			body: req.body, func: 'add', obj: 'ApplicationsCtrl'
		});
		res.status(400).send('Name is required to create a new app');
	} else {
		logger.log({
			description:'Applications add called with name.',
			name: req.body.name, body: req.body, func: 'add', obj: 'ApplicationsCtrl'
		});
		let appData = _.extend({}, req.body);
		let appName = req.body.name;
		if(!_.has(appData, 'owner')){
			logger.log({
				description: 'No owner data provided. Using account.',
				account: req.user, func: 'add', obj: 'ApplicationsCtrl'
			});
			if(_.has(req, 'userId') || _.has(req, 'accountId')){
				appData.owner = req.accountId ? req.accountId : req.userId;
			} else if (req.user && (_.has(req.user, 'id') || _.has(req.user, 'accountId'))) {
				appData.owner = req.user.id ? req.user.id : req.user.accountId;
			} else {
				logger.error({
					description: 'Invalid owner data provided.',
					func: 'add', obj: 'ApplicationsCtrl'
				});
				return res.status(400).send('Owner is required to create application');
			}
		}
		findApplication(appName).then((foundApp) => {
			logger.error({
				description: 'Application with this name already exists.',
				foundApp: foundApp, func: 'add', obj: 'ApplicationsCtrl'
			});
			res.status(400).send('Application with this name already exists.');
		}, (err) => {
			if(err && err.status == 'EXISTS'){
				return res.status(400).send('Application with this name already exists.');
			}
			logger.log({
				description: 'Application does not already exist.',
				func: 'add', obj: 'Application'
			});
			let application = new Application(appData);
			if(_.has(req.body,'template')){
				//Template name was provided
				let templateData = {name: req.body.template};
				templateData.type = req.body.templateType ? req.body.templateType : 'firebase';
				application.createWithTemplate(templateData).then((newApp) => {
					logger.log({
						description: 'Application created with template.',
						newApp: newApp, func: 'add', obj: 'Application'
					});
					res.json(newApp);
				}, (err) => {
					logger.error({
						description: 'Error creating application.',
						error: err, func: 'add', obj: 'Application'
					});
					res.status(400).send('Error creating application.');
				});
			} else {
				//Template name was not provided
				application.save().then((newApplication) => {
					logger.log({
						description: 'Application created successfully.',
						application: newApplication, func: 'add', obj: 'Application'
					});
					res.send(newApplication);
				}, (err) => {
					logger.error({
						description: 'Application does not already exist.',
						error: err, func: 'add', obj: 'Application'
					});
					res.send(500).send('Error saving application.');
				});
			}
		});
	}
};

/**
 * @api {put} /applications Update Application
 * @apiDescription Update an application.
 * @apiName UpdateApplication
 * @apiGroup Application
 *
 * @apiParam {String} name Name of application
 * @apiParam {Object} owner Owner of application
 * @apiParam {String} owner.username Application owner's username
 *
 * @apiSuccess {Object} applicationData Object containing updated applications data.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       name: "exampleApp",
 *       owner: {username:"hackerguy1", email:"test@test.com", name:"John Doe"},
 *       frontend:{bucketName:"tessellate-exampleApp", provider:"Amazon", siteUrl:"tessellate-exampleApp.s3website.com"},
 *       createdAt:1438737438578,
 *       updatedAt:1438737438578
 *     }
 * @apiErrorExample  Error-Response (Not Found):
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "message":"Application not found."
 *     }
 *
 */
export function update(req, res, next) {
	logger.log({
		description: 'App update request.', params: req.params,
		func: 'update', obj: 'ApplicationsCtrls'
	});
	if(req.params.name){
		Application.update({name:req.params.name}, req.body, {upsert:false},  (err, affected, result)  => {
			if(err){
				logger.error({
					description: 'Error updating application.',
					error: err, func: 'update', obj: 'ApplicationsCtrls'
				});
				return res.status(500).send('Error updating Application.');
			}
			//TODO: respond with updated data instead of passing through req.body
			logger.log({
				description: 'Application update successful.',
				affected: affected, func: 'update', obj: 'ApplicationsCtrls'
			});
			if(affected.nModified == 0 || affected.n == 0){
				//TODO: Handle Application not found
				logger.error({
					description: 'Application not found.', affected: affected,
					func: 'update', obj: 'ApplicationsCtrls'
				});
				res.status(400).send({message:'Application not found'});
			} else {
				logger.error({
					description: 'Application updated successfully.',
					affected: affected, func: 'update', obj: 'ApplicationsCtrls'
				});
				res.json(req.body);
			}
		});
	} else {
		res.status(400).send({message:'Application id required'});
	}
};

/**
 * @api {delete} /application/:id Delete Application
 * @apiDescription Delete an application.
 * @apiName DeleteApplication
 * @apiGroup Application
 *
 * @apiParam {String} name Name of application
 *
 * @apiSuccess {Object} applicationData Object containing deleted applications data.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       name: "exampleApp",
 *       owner: {username:"hackerguy1", email:"test@test.com", name:"John Doe"},
 *       frontend:{bucketName:"tessellate-exampleApp", provider:"Amazon", siteUrl:"tessellate-exampleApp.s3website.com"},
 *       createdAt:1438737438578,
 *       updatedAt:1438737438578
 *     }
 *
 * @apiErrorExample  Error-Response (Not Found):
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "message":"Application not found."
 *     }
 *
 */
export function del(req, res, next) {
	let query = Application.findOneAndRemove({'name':req.params.name}); // find and delete using id field
	query.then((result) => {
		if(result){
			let app = new Application(result);
			app.removeStorage().then(() => {
				logger.log({
					description: 'Application storage deleted successfully.',
					func: 'delete', obj: 'ApplicationsCtrl'
				});
				res.json(result);
			}, (err) => {
				logger.error({
					description: 'Error removing storage from application.',
					error: err, func: 'delete', obj: 'ApplicationsCtrl'
				});
				res.status(400).send(err);
			});
		} else {
			logger.error({
				description: 'Application not found.', error: err,
				func: 'delete', obj: 'ApplicationsCtrl'
			});
			res.status(400).send('Application could not be found.');
		}
	}, (err) => {
		logger.error({
			description: 'Error getting application.', error: err,
			func: 'delete', obj: 'ApplicationsCtrl'
		});
		res.status(500).send('Error deleting Application.');
	});
};


/**
 * @api {put} /applications/:name/files  Get Files
 * @apiDescription Get the list of files for a specific application.
 * @apiName Files
 * @apiGroup Application
 *
 * @apiParam {File} file1 File to upload. Key (<code>file1</code>) does not hold significance as all files are uploaded.
 * @apiParam {File} file2 Second File to upload. Again, Key (<code>file2</code>) does not hold significance as all files are uploaded.
 *
 * @apiSuccess {Object} applicationData Object containing updated applications data.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       name: "exampleApp",
 *       owner: {username:"hackerguy1", email:"test@test.com", name:"John Doe"},
 *       frontend:{bucketName:"tessellate-exampleApp", provider:"Amazon", siteUrl:"tessellate-exampleApp.s3website.com"},
 *       createdAt:1438737438578,
 *       updatedAt:1438737438578
 *     }
 *
 * @apiErrorExample  Error-Response (Not Found):
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "message":"Application not found."
 *     }
 *
 */
export function files(req, res, next) {
	//TODO: Check that account is owner or collaborator before uploading
	//TODO: Lookup application and run uploadFile =>
	if(req.params.name){ //Get data for a specific application
		let query = Application.findOne({name:req.params.name}).populate({path:'owner', select:'username name title email'});
		query.then((foundApp) => {
			if(foundApp){
				foundApp.getStructure().then((appFiles) => {
					logger.log({
						description: 'Get structure returned.',
						structure: appFiles, func: 'files', obj: 'ApplicationsCtrls'
					});
					res.send(appFiles);
				}, (err) => {
					logger.error({
						description: 'Error getting application file structure.',
						error: err, func: 'files', obj: 'ApplicationsCtrls'
					});
					res.status(400).send('Error getting Application files.');
				});
			} else {
				logger.error({
					description: 'Application could not be found.',
					func: 'files', obj: 'ApplicationsCtrls'
				});
				res.status(400).send('Application could not be found.');
			}
		}, (err) => {
			logger.error({
				description: 'Error getting application:', error: err,
				func: 'files', obj: 'ApplicationsCtrls'
			});
			return res.status(500).send('Error getting Application files.');
		});
	} else {
		logger.info({
			description: 'Application name is required to get files list.',
			func: 'files', obj: 'ApplicationsCtrls'
		});
		res.status(400).send('Application name is required to get files list.');
	}
};

/**
 * @api {put} /applications/:name/publish  Publish File
 * @apiDescription Publish/Upload a specified file to the storage/hosting for application matching the name provided.
 * @apiName UploadFile
 * @apiGroup Application
 *
 * @apiParam {String} name Name of
 * @apiParam {String} content Text string content of file
 * @apiParam {String} filetype Type of file the be uploaded
 *
 * @apiSuccess {Object} applicationData Object containing updated applications data.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       name: "exampleApp",
 *       owner: {username:"hackerguy1", email:"test@test.com", name:"John Doe"},
 *       frontend:{bucketName:"tessellate-exampleApp", provider:"Amazon", siteUrl:"tessellate-exampleApp.s3website.com"},
 *       createdAt:1438737438578,
 *       updatedAt:1438737438578
 *     }
 *
 * @apiErrorExample  Error-Response (Not Found):
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "message":"Application not found."
 *     }
 *
 */
 let localDir = "./public";
export function publishFile(req, res, next) {
	logger.info({
		description: 'File publish request.', func: 'publishFile',
		params: req.params, obj: 'ApplicationsCtrls'
	});
	//TODO: Check that account is owner or collaborator before uploading
	//TODO: Lookup application and run uploadFile =>
	if(req.params.name){ //Get data for a specific application
		let query = Application.findOne({name:req.params.name})
		.populate({path:'owner', select:'username name title email'});
		isList = false;
		query.then((foundApp) => {
			if(foundApp){
				foundApp.publishFile({content:req.body.content, key:req.body.key, contentType:req.body.contentType}).then((result) => {
					logger.info({
						description: 'File published successfully.',
						func: 'publishFile', result: result,
						obj: 'ApplicationsCtrls'
					});
					res.send(result);
				}, (err) => {
					logger.log({
						description: 'Error publishing file.',
						error: err, func: 'publishFile',
						obj: 'ApplicationsCtrls'
					});
					res.status(400).send(err);
				});
			} else {
				logger.error({
					description: 'Error finding application.', func: 'publishFile',
					params: req.params, obj: 'ApplicationsCtrls'
				});
				res.status(400).send('Application could not be found.');
			}
		}, (err) => {
			logger.error({
				description: 'Error finding application.',
				params: req.params, error: err,
				func: 'publishFile', obj: 'ApplicationsCtrls'
			});
			res.status(500).send('Error publishing file to Application.');
		});
	} else {
		logger.error({
			description: 'Application name and file data are required to publish a file.',
			params: req.params, func: 'publishFile',
			obj: 'ApplicationsCtrls'
		});
		res.status(400).send('Application name and fileData are required to upload file.');
	}
};

/**
 * @api {put} /applications/:name/template  Apply Template
 * @apiDescription Apply a template to the application matching the name provided.
 * @apiName applyTemplate
 * @apiGroup Application
 *
 * @apiParam {String} name Name of template
 *
 * @apiSuccess {Object} applicationData Object containing application's data.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       name: "exampleApp",
 *       owner: {username:"hackerguy1", email:"test@test.com", name:"John Doe"},
 *       frontend:{bucketName:"tessellate-exampleApp", provider:"Amazon", siteUrl:"tessellate-exampleApp.s3website.com"},
 *       createdAt:1438737438578,
 *       updatedAt:1438737438578
 *     }
 *
 * @apiErrorExample  Error-Response (Not Found):
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "message":"Application not found."
 *     }
 *
 */
 //TODO: Allow for deleteing/not deleteing all of the bucket files before applying template
export function applyTemplate(req, res, next) {
	logger.log({
		description: 'apply template request with app name: ', name: req.params.name,
		func: 'applyTemplate', obj: 'ApplicationsCtrl'
	});
	//TODO: Check that account is owner or collaborator before uploading
	//TODO: Lookup application and run uploadFile =>
	if(req.params.name){ //Get data for a specific application
		let query = Application.findOne({name:req.params.name})
		.populate({path:'owner', select:'username name title email'});
		query.then((foundApp) => {
			if(!foundApp){
				logger.error({
					description: 'Error finding application.',
					func: 'applyTemplate', obj: 'ApplicationsCtrl'
				});
				return res.status(400).send('Application could not be found.');
			}
			//TODO: Get url from found app, and get localDir from
			foundApp.applyTemplate(req.body.name).then( (webUrl) => {
				logger.log({
					description: 'Template applied to bucket successfully',
					func: 'applyTemplate', obj: 'ApplicationsCtrl'
				});
				res.send(webUrl);
			}, (err) => {
				logger.log({
					description: 'Error applying template.', error: err,
					func: 'applyTemplate', obj: 'ApplicationsCtrl'
				});
				res.status(400).send(err);
			});
		}, (err) => {
			logger.error({
				description: 'Error getting application:', error: err,
				func: 'applyTemplate', obj: 'ApplicationsCtrl'
			});
			res.status(500).send('Error applying template to Application.');
		});
	} else {
		res.status(400).send('Application name and template name are required to upload file');
	}
};

/**
 * @api {put} /applications/:name/storage  Add File Storage
 * @apiDescription Add File Storage + Hosting to the application matching the name provided. Currently handled with Amazon's S3.
 * @apiName addStorage
 * @apiGroup Application
 *
 * @apiSuccess {Object} applicationData Object containing updated applications data.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       name: "exampleApp",
 *       owner: {username:"hackerguy1", email:"test@test.com", name:"John Doe"},
 *       frontend:{bucketName:"tessellate-exampleApp", provider:"Amazon", siteUrl:"tessellate-exampleApp.s3website.com"},
 *       createdAt:1438737438578,
 *       updatedAt:1438737438578
 *     }
 * @apiErrorExample  Error-Response (Not Found):
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "message":"Application not found."
 *     }
 *
 *
 */
 //TODO: Allow for deleteing/not deleteing all of the bucket files before applying template
export function addStorage(req, res, next) {
	logger.log({
		description: 'add storage request with app name.',
		appName: req.params.name, func: 'addStorage', obj: 'ApplicationsCtrl'
	});
	//TODO: Check that account is owner or collaborator before uploading
	//TODO: Lookup application and run uploadFile =>
	if(!req.params.name){ //Get data for a specific application
		return res.status(400).send('Application name and storage information are required to add storage');
	}
	let query = Application.findOne({name:req.params.name})
	.populate({path:'owner', select:'username name title email'});
	query.then((foundApp) => {
		if(!foundApp){
			logger.warn({
				description: 'Application not found.',
				func: 'addStorage', obj: 'ApplicationsCtrl'
			});
			return res.status(400).send('Application could not be found');
		}
		//TODO: Get url from found app, and get localDir from
		foundApp.createStorage().then((webUrl) => {
			logger.log({
				description: 'Added storage to application successfully.',
				storageUrl: 'webUrl', func: 'addStorage', obj: 'ApplicationsCtrl'
			});
			res.send(webUrl);
		},  (err) => {
			logger.log({
				description: 'Error adding storage to application:', error: err,
				func: 'addStorage', obj: 'ApplicationsCtrl'
			});
			res.status(500).send(err);
		});
	}, (err) => {
		logger.error({
			description: 'Error getting application.',
			error: err, func: 'addStorage', obj: 'ApplicationsCtrl'
		});
		res.status(500).send('Error adding storage to application.');
	});
};

/**
 * @api {put} /applications/:name/collaborators  Add File Storage
 * @apiDescription Add collaborators by providing their usernames
 * @apiName addCollaborators
 * @apiGroup Application
 *
 * @apiSuccess {Array} accounts Array containing usernames of accounts to add as collaborators
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       name: "exampleApp",
 *       owner: {username:"hackerguy1", email:"test@test.com", name:"John Doe"},
 *       frontend:{bucketName:"tessellate-exampleApp", provider:"Amazon", siteUrl:"tessellate-exampleApp.s3website.com"},
 *       collaborators:[],
 *       createdAt:1438737438578,
 *       updatedAt:1438737438578
 *     }
 * @apiErrorExample  Error-Response (Not Found):
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "message":"Application not found."
 *     }
 *
 *
 */
 //TODO: Allow for deleteing/not deleteing all of the bucket files before applying template
export function addCollaborators(req, res, next) {
	logger.log({
		description: 'add storage request with app name: ', name: req.params.name,
		func: 'addCollaborators', obj: 'ApplicationsCtrl'
	});
	//TODO: Check that account is allowed to add collaborators
	if(req.params.name && req.body.accounts){ //Get data for a specific application
		let query = Application.findOne({name:req.params.name}).populate({path:'owner', select:'username name title email'});
		query.then((foundApp) => {
			if(!foundApp){
				logger.warn({
					description: 'Application not found.',
					func: 'addCollaborators', obj: 'ApplicationsCtrl'
				});
				return res.status(400).send('Application could not be found');
			}
			foundApp.addCollaborators(req.body.accounts).then((appWithCollabs) => {
				logger.log({
					description: 'Added storage to application successfully:', app: appWithCollabs,
					func: 'addCollaborators', obj: 'ApplicationsCtrl'
				});
				res.send(appWithCollabs);
			}, (err) => {
				logger.log({
					description: 'Error adding collaborators to application:', error: err,
					func: 'addCollaborators', obj: 'ApplicationsCtrl'
				});
				res.status(500).send(err);
			});
		}, (err) => {
			logger.error({
				description: 'Error getting application.',
				error: err, func: 'addCollaborators', obj: 'ApplicationsCtrl'
			});
			return res.status(500).send('Error adding collaborators to application.');
		});
	} else {
		res.status(400).send('Application name and accounts array are required to add collaborators.');
	}
};

/**
 * @api {put} /applications/:name/login  Add File Storage
 * @apiDescription Log into an application
 * @apiName login
 * @apiGroup Application
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       username:"hackerguy1",
 *       email:"test@test.com",
 *       name:"John Doe"
 *     }
 * @apiErrorExample  Error-Response (Not Found):
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "message":"Account not found."
 *     }
 *
 *
 */
 //TODO: Allow for deleteing/not deleteing all of the bucket files before applying template
export function login(req, res, next) {
	logger.log({
		description: 'App Login request.',
		appName: req.params.name, body: req.body,
		func: 'login', obj: 'ApplicationCtrl'
	});
	if(!req.params.name || !req.body) {
		return res.status(400).send('Application name and accounts array are required to add collaborators.');
	}
	if ((!_.has(req.body, 'username') && !_.has(req.body, 'email')) || !_.has(req.body, 'password')){ //Get data for a specific application
		logger.log({
			description: 'Username/Email and password are required to login.',
			appName: req.params.name, body: req.body,
			func: 'login', obj: 'ApplicationCtrl'
		});
		return res.status(400).send('Username/Email and Password are required to login.');
	}
	let loginData =  {password: req.body.password};
	if (_.has(req.body, 'username')) {
		if(req.body.username.indexOf('@') !== -1){
			loginData.email = req.body.username;
		} else {
			loginData.username = req.body.username
		}
	}
	if (_.has(req.body, 'email')) {
		loginData.email = req.body.email;
	}
	// logger.log({description: 'LoginData built', loginData: loginData, func: 'login', obj: 'ApplicationCtrl'})
	findApplication(req.params.name).then((foundApp) => {
		logger.log({
			description: 'Application found successfully.',
			foundApp: foundApp, func: 'login',
			obj: 'ApplicationCtrl'
		});
		//Use authrocket login if application has authRocket data
		foundApp.login(loginData).then((loginRes) => {
			logger.log({
				description: 'Login Successful.', response: loginRes,
				func: 'login', obj: 'ApplicationsCtrl'
			});
			res.send(loginRes);
		}, (err) => {
			//TODO: Handle wrong password
			logger.error({
				description: 'Error logging in.', error: err,
				func: 'login', obj: 'ApplicationsCtrl'
			});
			res.status(400).send(err || 'Login Error.');
		});
	}, (err) => {
		logger.error({
			description: 'Error finding applicaiton.', error: err,
			func: 'login', obj: 'ApplicationsCtrl'
		});
		res.status(400).send('Application not found.');
	});
};

/**
 * @api {put} /applications/:name/logout  Add File Storage
 * @apiDescription Log a user out of an application
 * @apiName logout
 * @apiGroup Application
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       username:"hackerguy1",
 *       email:"test@test.com",
 *       name:"John Doe"
 *     }
 * @apiErrorExample  Error-Response (Not Found):
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "message":"Account not found."
 *     }
 *
 *
 */
export function logout(req, res, next) {
	logger.log({
		description: 'App Logout request.',
		func: 'logout', obj: 'ApplicationCtrl'
	});
	let userData;
	if(req.user){
		userData = req.user;
	}
	if(!req.user && req.body){
		userData = req.body;
	}
	if(req.params.name && req.body){ //Get data for a specific application
		findApplication(req.params.name).then((foundApp) => {
			logger.log({
				description: 'Application found successfully.',
				foundApp: foundApp, func: 'logout', obj: 'ApplicationCtrl'
			});
			logger.log({
				description: 'Logging out of application.',
				foundApp: foundApp, userData: userData,
				func: 'logout', obj: 'ApplicationCtrl'
			});
			foundApp.logout(userData).then(() => {
				logger.log({
					description: 'Logout successful.',
					func: 'logout', obj: 'ApplicationCtrl'
				});
				res.send('Logout successful.');
			}, (err) => {
				logger.error({
					description: 'Error logging out of application',
					error: err, func: 'logout', obj: 'ApplicationCtrl'
				});
				res.status(400).send('Error logging out.');
			});
		}, (err) => {
			logger.error({
				description: 'Error finding application.',
				error: err, func: 'logout', obj: 'ApplicationCtrl'
			});
			res.status(400).send('Application not found.');
		});
	} else {
		logger.error({
			description: 'Invalid logout request.',
			func: 'logout', obj: 'ApplicationCtrl'
		});
		res.status(400).send('Error logging out.');
	}
};

/**
 * @api {put} /applications/:name/signup  Signup
 * @apiDescription Signup a user to an application
 * @apiName signup
 * @apiGroup Application
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       username:"hackerguy1",
 *       email:"test@test.com",
 *       name:"John Doe"
 *     }
 * @apiErrorExample  Error-Response (Exists):
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "message":"Account already exists."
 *     }
 *
 *
 */
export function signup(req, res, next) {
	logger.log({
		description: 'App signup request.',
		appName: req.params.name, body: req.body,
		func: 'signup', obj: 'ApplicationsCtrl'
	});
	if(req.params.name && req.body){ //Get data for a specific application
		findApplication(req.params.name).then((foundApp) => {
			logger.log({
				description: 'App found.', foundApp: foundApp,
				func: 'signup', obj: 'ApplicationsCtrl'
			});
			if(foundApp.authRocket && foundApp.authRocket.jsUrl){
				logger.log({
					description: 'App signup request.',
					appName: req.params.name, body: req.body,
					func: 'signup', obj: 'ApplicationsCtrl'
				});
				foundApp.authRocketSignup(req.body).then( (signupRes) => {
					logger.log({
						description: 'Signup to application successful.',
						res: signupRes, appName: req.params.name,
						body: req.body, func: 'signup',
						obj: 'ApplicationsCtrl'
					});
					res.send(signupRes);
				}, (err) => {
					logger.error({
						description: 'Error signing up to application.',
						error: err, appName: req.params.name,
						body: req.body, func: 'signup',
						obj: 'ApplicationsCtrl'
					});
					res.status(400).send(err);
				});
			} else {
				let signupData = req.body;
				signupData.application = foundApp._id;
				foundApp.signup(signupData).then((signupRes) => {
					logger.log({
						description: 'Signup to application successful.',
						res: signupRes, appName: req.params.name,
						body: req.body, func: 'signup', obj: 'ApplicationsCtrl'
					});
					res.send(signupRes);
				},  (err) => {
					if(err && err.status == 'EXISTS'){
						logger.error({
							description: 'Account with matching credentials already exists.',
							error: err, appName: req.params.name,
							func: 'signup', obj: 'ApplicationsCtrl'
						});
						res.status(400).send(err.message || 'Account with matching credentials already exists.');
					} else {
						//TODO: Handle wrong password
						logger.error({
							description: 'Error signing up to application.',
							error: err, appName: req.params.name,
							body: req.body, func: 'signup',
							obj: 'ApplicationsCtrl'
						});
						res.status(400).send(err.message || 'Error signing up.');
					}
				});
			}
		},  (err) => {
			logger.error({
				description: 'Error finding application.',
				error: err, appName: req.params.name,
				body: req.body, func: 'signup',
				obj: 'ApplicationsCtrl'
			});
			res.status(400).send('Error finding application.');
		});
	} else {
		logger.error({
			description: 'Application name is required to signup.',
			func: 'signup', obj: 'ApplicationsCtrl'
		});
		res.status(400).send('Application name is required to signup.');
	}
};
/**
 * @api {put} /verify Verify
 * @apiDescription Verify token and get matching account's data.
 * @apiName Verify
 * @apiGroup Auth
 *
 * @apiSuccess {Object} accountData Object containing accounts data.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       name: "John Doe",
 *       username:"hackerguy1",
 *       title: "Front End Developer",
 *       role:"admin",
 *       createdAt:1438737438578
 *       updatedAt:1438737438578
 *     }
 *
 */
export function verify(req, res, next) {
	//TODO:Actually verify account instead of just returning account data
	//TODO: Get applicaiton and verify that user exists within applicaiton
	let findObj = {};
	if(req.user){
		//Find by username in token
		if(_.has(req.user, "username")){
			findObj.username = req.user.username;
		} else {
			//Find by email in token
			findObj.email = req.user.email;
		}
		let query = Account.findOne(findObj).select('username email sessionId');
		query.then((result) => {
			if(!result){
				//Matching account already exists
				// TODO: Respond with a specific error code
				logger.error({
					description:'Error querying for account', error: err,
					func: 'verify', obj: 'ApplicationsCtrl'
				});
				return res.status(400).send('Account with this information does not exist.');
			}
			res.json(result);
		}, (err) => {
			logger.error({
				description:'Error querying for account', error: err,
				func: 'verify', obj: 'ApplicationsCtrl'
			});
			res.status(500).send('Unable to verify token.');
		});
	} else if(_.has(req, 'body') && _.has(req.body, 'token')) {
		//TODO: Handle invalidating token within body.
		logger.error({
			description:'Logout token within body instead of header.',
			func: 'verify', obj: 'ApplicationsCtrl'
		});
		res.status(401).send('Valid Auth token required to verify');
	} else {
		logger.log({
			description: 'Invalid auth token.',
			func: 'verify', obj: 'ApplicationsCtrl'
		});
		res.status(401).send('Valid Auth token required to verify');
	}
};
/**
 * @api {get} /applications/:appName/groups/:groupName Group(s)
 * @apiDescription Get an applications group(s)
 * @apiName groups
 * @apiGroup Application
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     [{
 *       name:"admins",
 *       accounts:[{username:"superuserguy", email: "test@test.com"}],
 *     }]
 * @apiErrorExample  Error-Response (Exists):
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "message":"Group does not exist."
 *     }
 *
 *
 */
export function groups(req, res, next) {
	logger.log({
		description: 'App get group(s) request called.',
		appName: req.params.name, body: req.body, func: 'groups'
	});
	if(req.params.name && req.body){ //Get data for a specific application
		findApplication(req.params.name).then((foundApp) => {
			//Check application's groups
			if(!req.params.groupName){
				logger.info({
					description: 'Application groups found.',
					foundApp: foundApp, func: 'groups', obj: 'ApplicationsCtrl'
				});
				res.send(foundApp.groups);
			} else {
				let group = _.findWhere(foundApp.groups, {name: req.params.groupName});
				if(group){
					logger.info({
						description: 'Application group found.',
						group: group, foundApp: foundApp,
						func: 'groups', obj: 'ApplicationsCtrl'
					});
					res.send(group);
				} else {
					//Check for application's auth rocket data
					if (foundApp.authRocket) {
						authRocket.Orgs().get().then((groupsRes) => {
							logger.log({
								description: 'Orgs loaded from authrocket.',
								response: groupsRes, func: 'groups',
								obj: 'ApplicationsCtrl'
							});
							res.send(groupsRes);
						},  (err) => {
							logger.error({
								description: 'Error gettings orgs from AuthRocket.',
								error: err, func: 'groups', obj: 'ApplicationsCtrl'
							});
							res.status(400).send(err);
						});
					} else {
						//Group has not been added to application
						let query = Group.findOne({name: req.params.groupName, application: foundApp._id});
						query.then((groupWithoutApp) => {
							if(!groupWithoutApp){
								logger.error({
									description: 'Group not found.', group: groupWithoutApp,
									foundApp: foundApp, func: 'groups', obj: 'ApplicationsCtrl'
								});
								res.status(400).send('Group not found.');
							} else {
								logger.log({
									description: 'Group found, but not within application. Adding to application.',
									group: groupWithoutApp, foundApp: foundApp,
									func: 'groups', obj: 'ApplicationsCtrl'
								});
								foundApp.addGroup(groupWithoutApp).then( (newGroup) => {
									logger.info({
										description: 'Existing group added to applicaiton.',
										group: groupWithoutApp, foundApp: foundApp,
										func: 'groups', obj: 'ApplicationsCtrl'
									});
									res.send(groupWithoutApp);
								}, (err) => {
									res.status(500).send('Error adding existing group to application.');
								});
							}
						}, (err) => {
							logger.error({
								description: 'Error finding group.', error: err,
								foundApp: foundApp, func: 'groups', obj: 'ApplicationsCtrl'
							});
							res.status(500).send('Error finding group.');
						});
					}
				}
			}
		},  (err) => {
			logger.error({
				description: 'Error finding application.',
				error: err, func: 'groups', obj: 'ApplicationsCtrl'
			});
			res.status(400).send('Error finding application.');
		});
	} else {
		logger.log({
			description: 'Application name is required to get application.',
			error: err, func: 'groups', obj: 'ApplicationsCtrl'
		});
		res.status(400).send('Application name is required.');
	}
};
/**
 * @api {post} /applications/:name/groups  addGroup
 * @apiDescription Add group
 * @apiName addGroup
 * @apiGroup Application
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     [{
 *       name:"admins",
 *       accounts:[{username:"superuserguy", email: "test@test.com"}],
 *     }]
 * @apiErrorExample  Error-Response (Exists):
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "message":"Group already exists"
 *     }
 *
 *
 */
export function addGroup(req, res, next) {
	logger.log({
		description: 'App add group request.',
		name: req.params.name, body: req.body,
		func: 'addGroup', obj: 'ApplicationsCtrls'
	});
	if(req.params.name && req.body){ //Get data for a specific application
		findApplication(req.params.name).then( (foundApp) => {
			logger.log({
				description: 'Application found. Adding group.',
				app: foundApp, func: 'addGroup', obj: 'ApplicationsCtrls'
			});
			foundApp.addGroup(req.body).then( (newGroup) => {
				logger.info({
					description: 'Group added to applicaiton successfully.',
					newGroup: newGroup, func: 'addGroup', obj: 'ApplicationsCtrls'
				});
				res.send(newGroup);
			},  (err) => {
				//TODO: Handle wrong password
				logger.error({
					description: 'Error adding group to application.',
					error: err, func: 'addGroup', obj: 'ApplicationsCtrls'
				});
				res.status(400).send('Error adding group.');
			});
		},  (err) => {
			logger.error({
				description: 'Error find application.',
				error: err, func: 'addGroup', obj: 'ApplicationsCtrls'
			});
			//TODO: Handle other errors
			res.status(400).send('Error finding application.');
		});
	} else {
		res.status(400).send('Application name is required.');
	}
};
/**
 * @api {put} /applications/:name/groups  updateGroup
 * @apiDescription Update a group
 * @apiName updateGroup
 * @apiGroup Application
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     [{
 *       name:"admins",
 *       accounts:[{username:"superuserguy", email: "test@test.com"}],
 *     }]
 * @apiErrorExample  Error-Response (Exists):
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "message":"Error updating group."
 *     }
 *
 *
 */
export function updateGroup(req, res, next) {
	logger.log({
		description: 'Update application group called.',
		appName: req.params.name, body: req.body,
		func: 'updateGroup', obj: 'ApplicationsCtrl'
	});
	if(req.params.name){ //Get data for a specific application
		findApplication(req.params.name).then( (foundApp) => {
			//Update is called with null or empty value
			logger.log({
				description: 'Application found.', foundApp: foundApp,
				func: 'updateGroup', obj: 'ApplicationsCtrl'
			});
			if(!_.keys(req.body) || _.keys(req.body).length < 1 || req.body == {} || req.body == null || !req.body){
				logger.log({
					description: 'Update group with null, will be handled as delete.',
					func: 'updateGroup', obj: 'ApplicationsCtrl'
				});
				//Delete group
				foundApp.deleteGroup({name: req.params.groupName}).then( (updatedGroup) => {
					logger.info({
						description: 'Application group deleted successfully.',
						updatedGroup: updatedGroup, func: 'updateGroup', obj: 'ApplicationsCtrl'
					});
					res.send(updatedGroup);
				}, (err) => {
					//TODO: Handle wrong password
					logger.error({
						description: 'Error deleting application group.',
						error: err, func: 'updateGroup', obj: 'ApplicationsCtrl'
					});
					if(err && err.status && err.status == 'NOT_FOUND'){
						res.status(400).send(err.message || 'Error deleting group.');
					} else {
						res.status(500).send('Error deleting group.');
					}
				});
			} else {
				logger.log({
					description: 'Provided data is valid. Updating application group.',
					foundApp: foundApp, updateData: req.body,
					func: 'updateGroup', obj: 'ApplicationsCtrl'
				});
				let updateData = _.extend({}, req.body);
				updateData.name = req.params.groupName;
				if(_.has(updateData, 'accounts')){
					//TODO: Compare to foundApps current accounts
					//TODO: Handle account usernames array
				}
				//Update group
				foundApp.updateGroup(updateData).then((updatedGroup) => {
					logger.info({
						description: 'Application group updated successfully.',
						updatedGroup: updatedGroup, func: 'updateGroup', obj: 'ApplicationsCtrl'
					});
					res.send(updatedGroup);
				}, (err) => {
					//TODO: Handle wrong password
					logger.error({
						description: 'Error updating application group.',
						error: err, func: 'updateGroup', obj: 'ApplicationsCtrl'
					});
					res.status(400).send("Error updating application's group.");
				});
			}
		}, (err) => {
			logger.error({
				description: 'Error finding application.',
				error: err, func: 'updateGroup', obj: 'ApplicationsCtrl'
			});
			res.status(400).send('Error finding application.');
		});
	} else {
		logger.log({
			description: 'Application name is required to update group.',
			func: 'updateGroup', obj: 'ApplicationsCtrl'
		});
		res.status(400).send('Application name is required to update application group.');
	}
};
/**
 * @api {put} /applications/:name/groups  deleteGroup
 * @apiDescription Update a group
 * @apiName deleteGroup
 * @apiGroup Application
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       username:"hackerguy1",
 *       email:"test@test.com",
 *       name:"John Doe"
 *     }
 * @apiErrorExample  Error-Response (Exists):
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "message":"Account already exists."
 *     }
 *
 *
 */
export function deleteGroup(req, res, next) {
	logger.log({
		description: 'App add group request with app name.', name: req.params.name,
		func: 'deleteGroup', obj: 'ApplicationsCtrl'
	});
	if(req.params.name && req.body){ //Get data for a specific application
		findApplication(req.params.name).then((foundApp) => {
			foundApp.deleteGroup(req.body).then(() => {
				logger.info({
					description: 'Group deleted successfully.',
					func: 'deleteGroup', obj: 'ApplicationsCtrl'
				});
				//TODO: Return something other than this message
				res.send('Group deleted successfully.');
			},  (err) => {
				//TODO: Handle wrong password
				logger.error({
					description: 'Error deleting group.', error: err,
					func: 'deleteGroup', obj: 'ApplicationsCtrl'
				});
				res.status(400).send('Error deleting group.');
			});
		},  (err) => {
			logger.error({
				description: 'Error finding application.', error: err,
				func: 'deleteGroup', obj: 'ApplicationsCtrl'
			});
			res.status(400).send('Error finding application.');
		});
	} else {
		logger.log({
			description: 'Application name is required to delete application group.',
			error: err, func: 'deleteGroup', obj: 'ApplicationsCtrl'
		});
		res.status(400).send('Application name is required to delete application group.');
	}
};
// Utility functions
//Wrap finding application in a promise that handles errors
//TODO: Allow choosing populate settings
function findApplication(appName) {
	if(!appName){
		logger.error({
			description: 'Application name is required to find application.',
			error: err, func: 'findApplication'
		});
		Promise.reject({message: 'Application name required to find application.'});
	} else {
		let query = Application.findOne({name:appName})
		.populate({path:'owner', select:'username name email'})
		.populate({path:'groups', select:'name accounts'})
		.populate({path:'directories', select:'name accounts groups'})
		return query.then((foundApp) => {
			if(!foundApp){
				logger.error({
					description: 'Application not found',
					func: 'findApplication'
				});
				return Promise.reject({message: 'Application not found'});
			} else {
				logger.log({
					description: 'Application found.',
					foundApp: foundApp, func: 'findApplication'
				});
				return foundApp;
			}
		}, (err) => {
			logger.error({
				description: 'Error finding application.',
				error: err, func: 'findApplication'
			});
			return Promise.reject({message: 'Error finding application.'});
		});
	}
}
// ------------------------------------------------------------------------------------------
// Current Errors.
// ------------------------------------------------------------------------------------------
/**
 * @apiDefine CreateAccountError
 * @apiVersion 0.0.1
 *
 * @apiError NoAccessRight Only authenticated Admins can access the data.
 * @apiError AccountNameTooShort Minimum of 5 characters required.
 *
 * @apiErrorExample  Response (example):
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "error": "AccountNameTooShort"
 *     }
 */
