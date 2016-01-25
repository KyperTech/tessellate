'use strict';

var _mongoose = require('mongoose');

var _mongoose2 = _interopRequireDefault(_mongoose);

var _lodash = require('lodash');

var _formidable = require('formidable');

var _formidable2 = _interopRequireDefault(_formidable);

var _util = require('util');

var _util2 = _interopRequireDefault(_util);

var _mkdirp = require('mkdirp');

var _mkdirp2 = _interopRequireDefault(_mkdirp);

var _rimraf = require('rimraf');

var _rimraf2 = _interopRequireDefault(_rimraf);

var _db = require('./../utils/db');

var _db2 = _interopRequireDefault(_db);

var _fileStorage = require('../utils/fileStorage');

var _fileStorage2 = _interopRequireDefault(_fileStorage);

var _sqs = require('./../utils/sqs');

var sqs = _interopRequireWildcard(_sqs);

var _logger = require('./../utils/logger');

var _logger2 = _interopRequireDefault(_logger);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var templateBucket = "tessellate-templates";

var TemplateSchema = new _mongoose2.default.Schema({
	name: { type: String, default: '', unique: true, index: true },
	author: { type: _mongoose2.default.Schema.Types.ObjectId, ref: 'User' },
	location: {
		storageType: { type: String },
		path: { type: String }
	},
	description: { type: String },
	tags: [{ type: String }],
	frameworks: [{ type: String }],
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now }
});

TemplateSchema.set('collection', 'templates');

TemplateSchema.methods = {
	uploadFiles: function uploadFiles(req) {
		var bucketName = undefined,
		    localDirectory = undefined;
		var self = this;
		//Create a new directory for template files
		var uploadDir = "fs/templates/" + this.name;
		//Accept files from form upload and save to disk
		var form = new _formidable2.default.IncomingForm(),
		    files = [],
		    fields = [];
		form.uploadDir = uploadDir;
		form.keepExtensions = true;
		return new Promise(function (resolve, reject) {
			(0, _mkdirp2.default)(form.uploadDir, function (error) {
				// path was created unless there was error
				if (error) {
					_logger2.default.error({
						description: 'Error creating directory', error: error,
						func: 'uploadFiles', obj: 'Template'
					});
					return Promise.reject(error);
				}
				//Parse form
				form.parse(req, function (error) {
					if (error) {
						_logger2.default.log({
							description: 'error parsing form:', error: error,
							func: 'uploadFiles', obj: 'Template'
						});
						Promise.reject(error);
					}
					_logger2.default.log({
						description: 'Form parsed',
						func: 'uploadFiles', obj: 'Template'
					});
				});
			});
			//TODO: Handle on error?
			form.on('fileBegin', function (name, file) {
				var pathArray = file.path.split("/");
				var path = (0, _lodash.first)(pathArray);
				path = path.join("/") + "/" + file.name;
				file.path = path;
			}).on('field', function (field, value) {
				// logger.log(field, value);
				//Handle form fields other than files
				fields.push([field, value]);
			}).on('file', function (field, file) {
				// logger.log(field, file);
				//Handle form files
				files.push([field, file]);
			}).on('end', function () {
				_logger2.default.log({
					description: 'Received files ', files: _util2.default.inspect(files),
					func: 'uploadFiles', obj: 'Template'
				});
				//TODO: Upload files from disk to S3
				_logger2.default.log({
					description: 'Upload localdir called.', location: self.location,
					func: 'uploadFiles', obj: 'Template'
				});
				_fileStorage2.default.uploadLocalDir({ bucket: self.location, localDir: uploadDir }).then(function () {
					//TODO: Remove files from disk
					_logger2.default.log({
						description: 'files upload successful.',
						func: 'uploadFiles', obj: 'Template'
					});
					(0, _rimraf2.default)(uploadDir, function (error) {
						if (error) {
							_logger2.default.error({
								description: 'Error deleting folder after upload to template',
								func: 'uploadFiles', obj: 'Template'
							});
							reject(error);
						}
						resolve();
					});
				}, function (error) {
					_logger2.default.error({
						description: 'Error uploading local directory.',
						error: error, func: 'uploadFiles', obj: 'Template'
					});
					return Promise.reject(error);
				});
			});
		});
	},
	createNew: function createNew(req) {
		var _this = this;

		//TODO: Verify that name is allowed to be used for bucket
		return this.save().then(function () {
			if (!req.files) {
				return _this;
			}
			return _this.uploadFiles(req).then(function () {
				_logger2.default.log({
					description: 'New template created and uploaded successfully',
					func: 'createNew', 'obj': 'Template'
				});
				return;
			}, function (error) {
				_logger2.default.log({
					description: 'Error uploading files to new template:', error: error,
					func: 'createNew', 'obj': 'Template'
				});
				return Promise.reject(error);
			});
		}, function (error) {
			_logger2.default.log({
				description: 'Error creating new template:', error: error,
				func: 'createNew', 'obj': 'Template'
			});
			return Promise.reject(error);
		});
	}
};

/*
 * Construct `User` model from `UserSchema`
 */
_db2.default.tessellate.model('Template', TemplateSchema);

/*
 * Make model accessible from controllers
 */
var Template = _db2.default.tessellate.model('Template');
Template.collectionName = TemplateSchema.get('collection');

exports.Template = _db2.default.tessellate.model('Template');