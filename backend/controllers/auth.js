/**
 * @description Authentication controller
 */
var mongoose = require('mongoose');
var url = require('url');
var _ = require('lodash');
var logger = require('../utils/logger');
var Account = require('../models/account').Account;
var Session = require('../models/session').Session;
/**
 * @api {post} /signup Sign Up
 * @apiDescription Sign up a new account and start a session as that new account
 * @apiName Signup
 * @apiGroup Auth
 *
 * @apiParam {Number} id Accounts unique ID.
 * @apiParam {String} username Accountname of account to signup as.
 * @apiParam {String} [title] Title of account to signup as.
 * @apiParam {String} email Email of account to signup as.
 * @apiParam {String} password Password of account to signup as.
 *
 * @apiSuccess {Object} accountData Object containing accounts data.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "name": "John",
 *       "title": "Doe",
 *     	 "role":"admin",
 *     }
 *
 */
exports.signup = (req, res, next) => {
	var query;
	logger.log({description: 'Signup request.', body: req.body});
	//Check for username or email
	if(!_.has(req.body, "username") && !_.has(req.body, "email")){
		return res.status(400).json({code:400, message:"Username or Email required to signup"});
	}
	if(_.has(req.body, "username")){
		query = Account.findOne({"username":req.body.username}); // find using username field
	} else {
		query = Account.findOne({"email":req.body.email}); // find using email field
	}
	query.then((result) => {
		if(result){ //Matching account already exists
			// TODO: Respond with a specific error code
			return res.status(400).send('Account with this information already exists.');
		}
		//account does not already exist
		//Build account data from request
		var account = new Account(req.body);
		// TODO: Start a session with new account
		account.createWithPass(req.body.password).then((newAccount) => {
			res.send(newAccount);
		}, (err) => {
			res.status(500).json({code:500, message:'Error hashing password', error:err});
		});
	}, (err) => {
		logger.error({description: 'Error querying for account.', error: err, func: 'signup', obj: 'AuthCtrl'});
		res.status(500).send('Error querying for account.'); 
	});
};

/**
 * @api {post} /login Login
 * @apiDescription Login and start a new session.
 * @apiName Login
 * @apiGroup Auth
 *
 * @apiParam {Number} id Users unique ID.
 * @apiParam {String} username Username of user to login as. Email must be provided if username is not.
 * @apiParam {String} [email] Email of user to login as. Can be used instead of username.
 * @apiParam {String} password Password of user to login as.
 *
 * @apiSuccess {Object} userData Object containing users data.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       account:{
 *         name: "John Doe",
 *         username:"hackerguy1",
 *         title: "Front End Developer",
 *         role:"admin",
 *         createdAt:1438737438578
 *         updatedAt:1438737438578
 *       },
 *       token:'99qaisnuufa9suf9ue0hf2h'
 *     }
 *
 */
exports.login = (req, res, next) => {
	var query;
	if(!_.has(req.body, "username") && !_.has(req.body, "email")){
		res.status(400).json({code:400, message:"Accountname or Email required to login"});
	} else {
		if(_.has(req.body, "username")){
			query = Account.findOne({"username":req.body.username}).populate({path:'groups', select:'name'}); // find using username field
		} else {
			query = Account.findOne({"email":req.body.email}); // find using email field
		}
		query.then((currentAccount) => {
			if(!currentAccount){
				logger.error({description: 'Account not found.', func: 'login', obj: 'AuthCtrl'});
				// return next (new Error('Account could not be found'));
				return res.status(409).send('Account not found.');
			}
			currentAccount.login(req.body.password).then((loginRes) => {
				logger.log({description: 'Login Successful.', func: 'login', obj: 'AuthCtrl'});
				res.send(loginRes);
			}, (err) => {
				//TODO: Handle wrong password
				logger.log({description: 'Login Error.', error: err, func: 'login', obj: 'AuthCtrl'});
				res.status(400).send('Error logging in.');
			});
		}, (err) => {
			logger.error({description: 'Login error', error: err, func: 'login', obj: 'AuthCtrl'});
			return res.status(500).send('Error logging in.');
		});
	}
};

/**
 * @api {post} /logout Logout
 * @apiDescription Logout the currently logged in account and invalidate their token.
 * @apiName Logout
 * @apiGroup Auth
 *
 * @apiSuccess {Object} accountData Object containing accounts data.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "message": "Logout successful"
 *     }
 *
 */
exports.logout = (req, res, next) => {
	//TODO:Invalidate token
	var account = new Account(req.user);
	// logger.log('ending accounts session:', account);
	account.endSession().then(() => {
		logger.log({description: 'Successfully ended session', func: 'logout', obj: 'AuthCtrl'});
		res.send({message:'Logout successful.'});
	}, (err) => {
		logger.error({description: 'Error ending session.', error: err});
		res.status(500).send({message:'Error ending session.'});
	});
};

/**
 * @api {put} /account Verify
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
exports.verify = (req, res, next) => {
	//TODO:Actually verify account instead of just returning account data
	// logger.log('verify request:', req.user);
	var query;
	if(req.user){
		//Find by username in token
		if(_.has(req.user, "username")){
			query = Account.findOne({username:req.user.username});
		}
		//Find by username in token
		else {
			query = Account.findOne({email:req.user.email});
		}
		query.then((result) => {
			if(!result){ //Matching account already exists
				// TODO: Respond with a specific error code
				logger.error({description: 'Account not found.', error: err, func: 'verify', obj: 'AuthCtrl'});
				return res.status(400).send('Account with this information does not exist.');
			}
			res.json(result);
		}, (err) => {
			logger.error({description: 'Error querying for account', error: err, func: 'verify', obj: 'AuthCtrl'});
			return res.status(500).send('Unable to verify token.');
		});
	} else {
		logger.error({description: 'Invalid auth token.', func: 'verify', obj: 'AuthCtrl'});
		res.status(401).json({status:401, message:'Valid Auth token required to verify'});
	}
};
