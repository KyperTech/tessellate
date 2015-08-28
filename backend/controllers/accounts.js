/**
 * @description Account controller functions
 */
var mongoose = require('mongoose');
var url = require('url');
var _ = require('underscore');
var w = require('../utils/mongoPromise');
var url = require('url');
var Account = require('../models/account').Account;

/**
 * @api {get} /accounts Get Account(s)
 * @apiDescription Get list of accounts
 * @apiName GetAccount
 * @apiGroup Account
 *
 * @apiParam {Number} id Accounts unique ID.
 *
 * @apiSuccess {Object} accountData Object containing accounts data.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "id":"189B7NV89374N4839"
 *       "name": "John Doe",
 *       "title": "Doe",
 *       "username": "john123",
 *       "email": "john123@gmail.com",
 *       "role":"account",
 *     }
 *
 */
exports.get = function(req, res, next){
	var isList = true;
	var query = Account.find({}, {username:1, email:1});
	if(_.has(req.params, "username")){ //Get data for a specific account
		console.log('account request with username:', req.params.username);
		query = Account.findOne({username:req.params.username}, {password:0, __v:0});
		isList = false;
	}
	w.runQuery(query).then(function(accountData){
		//Remove sensitiveaccount data from account
		res.send(accountData);
	}, function(err){
		res.status(500).send('Error getting account:', err);
	});
};
/**
 * @api {post} /accounts Add Account
 * @apiDescription Add a new account.
 * @apiName AddAccount
 * @apiGroup Account
 *
 * @apiParam {String} username Accountname of account
 * @apiParam {String} email Email of account
 * @apiParam {String} password Password of account
 * @apiParam {String} name Name of account
 * @apiParam {String} title Title of account
 * @apiParam {Boolean} tempPassword Whether or not to set a temporary password (Also set if there is no password param)
 *
 * @apiSuccess {Object} accountData Object containing newly created accounts data.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "id":"189B7NV89374N4839"
 *       "name": "John",
 *       "title": "Doe",
 *       "role":"account",
 *     }
 *
 */
exports.add = function(req, res, next){
	//Query for existing account with same _id
	var query;
	if(!_.has(req.body, "username") && !_.has(req.body, "email")){
		return res.status(400).json({code:400, message:"Accountname or Email required to add a new account"});
	}
	if(_.has(req.body, "username")){
		query = Account.findOne({"username":req.body.username}); // find using username field
	} else {
		query = Account.findOne({"email":req.body.email}); // find using email field
	}
	w.runQuery(query).then(function(){
		var account = new Account(req.body);
		account.saveNew().then(function(newAccount){
			//TODO: Set temporary password
			res.json(newAccount);
		}, function(err){
			console.error('error creating new account:', err);
			res.status(500).send('account could not be added');
		});
	}, function(err){
		//next() //Pass error on
		console.error('error creating new account:', err);
		res.status(500).send({message:'Account could not be added.'});
	});
};
/**
 * @api {put} /accounts Update Account
 * @apiDescription Update a account.
 * @apiName UpdateAccount
 * @apiGroup Account
 *
 * @apiParam {String} username Email of account
 * @apiParam {String} password Password of account
 * @apiParam {String} name Name of account
 * @apiParam {String} title Title of account
 * @apiParam {String} role Role of account (admin, account)
 *
 * @apiSuccess {Object} accountData Object containing updated accounts data.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "id":"189B7NV89374N4839"
 *       "name": "John",
 *       "title": "Doe",
 *       "role":"account",
 *     }
 *
 */
exports.update = function(req, res, next){
	if(_.has(req.params, "username")){
		Account.update({username:req.params.username}, req.body, {upsert:false}, function (err, numberAffected, result) {
			if (err) { return next(err); }
			//TODO: respond with updated data instead of passing through req.body
			res.json(req.body);
		});
	} else {
		res.status(400).send({message:'Account id required'});
	}
};
/**
 * @api {delete} /account/:id Delete Account
 * @apiDescription Delete a account.
 * @apiName DeleteAccount
 * @apiGroup Account
 *
 * @apiParam {String} username Email of account
 *
 * @apiSuccess {Object} accountData Object containing deleted accounts data.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "id":"189B7NV89374N4839"
 *       "name": "John",
 *       "title": "Doe",
 *       "role":"account",
 *     }
 *
 */
exports.delete = function(req, res, next){
	// var urlParams = url.parse(req.url, true).query;
	if(_.has(req.params, "username")){
		var query = Account.findOneAndRemove({'username':req.params.username}); // find and delete using id field
		w.runQuery(query).then(function(result){
			console.log('Account deleted successfully:');
			res.json(result);
		}, function(err){
			console.error('Account could not be deleted:', err);
			res.status(500).send({message:'Account cound not be deleted'});
		});
	}
};
/**
 * @api {delete} /account/:id Search Accounts
 * @apiDescription Search Accounts.
 * @apiName SearchAccount
 * @apiGroup Account
 *
 * @apiParam {String} searchQuery String to search through accounts with
 *
 * @apiSuccess {Object} accountData Object containing deleted accounts data.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "id":"189B7NV89374N4839"
 *       "name": "John",
 *       "title": "Doe",
 *       "role":"account",
 *     }
 *
 */
exports.search = function(req, res, next){
	// var urlParams = url.parse(req.url, true).query;
	var usernameQuery = createAccountQuery('username', req.params.searchQuery);
	var emailQuery = createAccountQuery('email', req.params.searchQuery);
	//Search usernames
	w.runQuery(usernameQuery).then(function(usernameResults){
		if(_.isArray(usernameResults) && usernameResults.length == 0){
			//Search emails
			w.runQuery(emailQuery).then(function (emailResults){
				console.log('Account search by email resulted:', emailResults);
				res.json(emailResults);
			}, function (err){
				res.status(500).send({message:'Account cound not be found'});
			});
		} else {
			console.log('Account search by username resulted:', usernameResults);
			res.json(usernameResults);
		}
	}, function (err){
		console.error('Account could not be found:', err);
		res.status(500).send({message:'Account cound not be found'});
	});
};
/**
 * Escape special characters
 */
function escapeRegExp(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}
/**
 * Create a account query based on provided key and value
 */
function createAccountQuery(key, val){
	var queryArr = _.map(val.split(' '), function (q) {
    var queryObj = {};
    queryObj[key] = new RegExp(escapeRegExp(q), 'i');
    return queryObj;
  });
  var find = {$or: queryArr};
	return Account.find(find, {email:1, name:1, username:1}); // find and delete using id field
}