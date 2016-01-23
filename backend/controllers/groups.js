import mongoose from 'mongoose';
import url from 'url';
import _ from 'lodash';
import logger from '../utils/logger';
import { Group } from '../models/group';

/**
 * @description Group controller functions
 */
/** Group Ctrl
 * @description Log an existing Group in
 * @params {String} email - Email of Group
 * @params {String} password - Password of Group
 */
export function get(req, res, next) {
	var isList = true;
	logger.log({description:  'Group(s) get request.', params: req.params, func: 'get', obj: 'GroupsCtrls'});
	var query = Group.find({}).populate({path:'users', select: 'name username email'});
	if(req.params.name){ //Get data for a specific Group
		query = Group.findOne({name:req.params.name})
		.populate({path:'directories', select:'name users groups'})
		.populate({path:'users', select:'name username email'});
		isList = false;
	}
	query.then((groupData) => {
		if(!groupData){
			logger.info({description:  'Group not found.', func: 'get', obj: 'GroupsCtrls'});
			return res.status(500).send('Group could not be found.');
		}
		res.send(groupData);
	}, (err) => {
		logger.error({description:  'Error querying group.', error: err, func: 'get', obj: 'GroupsCtrls'});
		return res.status(500).send('Error getting group(s).');
	})
};

/** Add Ctrl
 * @description Add a Group
 * @params {String} email - Email of Group
 * @params {String} password - Password of Group
 * @params {String} name - Name of Group
 * @params {String} title - Title of Group

 * @params {Boolean} tempPassword - Whether or not to set a temporary password (Also set if there is no password param)
 */
export function add(req, res, next) {
	//Group does not already exist
	logger.log({description: 'Group request.', body: req.body, func: 'add', obj: 'GroupsCtrls'});
	if(req.body && _.has(req.body, "name")){
		//TODO: Handle array of users
		var query = Group.findOne({"name":req.body.name}); // find using email field
		query.then(() => {
			var group = new Group(req.body);
			group.saveNew().then((newGroup) => {
				res.json(newGroup);
			}, (err) => {
				logger.error({description: 'Error saving group', error: err, func: 'add', obj: 'GroupsCtrls'});
				res.status(500).send('New group could not be added:', err);
			})
		}, (err) => {
			logger.error({description: 'Error querying group.', error: err, func: 'add', obj: 'GroupsCtrls'});
			res.status(500).send('New group could not be added.');
		});
	} else {
		logger.info({description: 'Group name is required to add group.', error: err, func: 'add', obj: 'GroupsCtrls'});
		res.status(500).send('Group name required');
	}
};
/** Update Ctrl
 * @description Update a Group
 * @params {String} email - Email of Group
 * @params {String} Groupname - Groupname of Group
 * @params {String} password - Password of Group
 * @params {String} name - Name of Group
 * @params {String} title - Title of Group
 */
export function update(req, res, next) {
	logger.log({description: 'Update called.', body: req.body, func: 'update', obj: 'GroupsCtrl'});
	if(!req.body || JSON.stringify(req.body) == "{}"){
		logger.log({description: 'Body is invalid/null. Deleting group.', func: 'update', obj: 'GroupsCtrl'});
		deleteGroup(req.params).then( (result) => {
			logger.info({description: 'Group deleted successfully.', result: result, func: 'update', obj: 'GroupsCtrl'});
			res.send(result);
		},  (err) => {
			logger.error({description: 'Error deleting group.', error: err, func: 'update', obj: 'GroupsCtrl'});
			if(err && err.status && err.status == 'NOT_FOUND'){
				res.status(400).send(err.message || 'Error deleting group.');
			} else {
				res.status(500).send('Error deleting group.');
			}
		});
	} else {
		Group.update({_id:req.id}, req.body, {upsert:true},  (err, numberAffected, result)  => {
			if(err) {
				logger.error('[GroupCtrl.update()] Error updating group:', err);
				return res.status(500).send('Error updating group.');
			} else if(!result){
				logger.error('[GroupCtrl.update()] Group not updated.');
				return res.status(500).send('Group could not be updated.');
			} else {
				res.send(result);
			}
		});
	}

};
/** Delete Ctrl
 * @description Delete a Group
 * @params {String} email - Email of Group
 */
export function del(req, res, next) {
	var urlParams = url.parse(req.url, true).query;
	deleteGroup(req.params).then((result) => {
		logger.log({description: 'Group deleted successfully', func: 'delete', obj: 'GroupsCtrl'});
		res.send(result);
	}, (err) => {
		logger.error({description: 'Error deleting group.', error: err, func: 'delete', obj: 'GroupsCtrl'});
		res.status(500).send(err.message || 'Error deleting group.');
	});
};

function deleteGroup(params){
	logger.log({
		description: 'Delete group called.',
		params: params, func: 'deleteGroup', file: 'GroupsCtrl'
	});
	var findObj = {};
	if(_.has(params, 'id')){
		findObj.id = params.id;
	} else if(_.has(params, 'name')){
		findObj.name = params.name;
	} else {
		findObj = params;
	}
	logger.log({
		description: 'Delete group find object created.',
		findObj: findObj, func: 'deleteGroup', file: 'GroupsCtrl'
	});
	var query = Group.findOneAndRemove(findObj); // find and delete using id field
	return query.then((result) => {
		if(!result){
			logger.error({
				description: 'Group not found.',
				func: 'deleteGroup', file: 'GroupsCtrl'
			});
			return Promise.reject({message: 'Group not found.', status: 'NOT_FOUND'});
		} else {
			logger.info({
				description: 'Group deleted successfully.',
				result: result, func: 'deleteGroup', file: 'GroupsCtrl'
			});
			return result;
		}
	}, (err) => {
			logger.error({
				description: 'Error deleting group.',
				error: err, func: 'deleteGroup', file: 'GroupsCtrl'
			});
			return err || {message: 'Error deleting group.'};
	});
}
