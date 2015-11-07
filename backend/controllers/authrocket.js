/** Authrocket controller
 *
 */
var logger = require('../utils/logger');
var Account = require('../models/account').Account;

/**
 * @description handles events from authrocket hook POST requests
 */
exports.events = (req, res, next) => {
  //TODO:Link to user account if matching account already exists and does not have linked account
  logger.log({
    description: 'Authrocket event recieved.',
    body: req.body, func: 'authrocket'
  });
  if(req.body.event_type){
    switch(req.body.event_type){
      case 'user.created':
          userCreated(req.body).then(() => {
            res.send('Thanks'); //Respond to authrocket post
          }, (err) => {
            logger.error({
              description: 'Error creating user in response to authrocket event.',
              body: req.body, func: 'events', obj: 'AuthrocketCtrls'
            });
            res.send('Thanks'); //Respond to authrocket post
          });
        break;
      case 'user.updated':
          userUpdated(req.body).then(() => {
            res.send('Thanks'); //Respond to authrocket post
          }, (err) => {
            logger.error({
              description: 'Error updating user in response to authrocket event.',
              body: req.body, func: 'events', obj: 'AuthrocketCtrls'
            });
            res.send('Thanks'); //Respond to authrocket post
          });
        break;
      case 'user.deleted':
          userDeleted(req.body).then(() => {
            res.send('Thanks'); //Respond to authrocket post
          }, (err) => {
            logger.error({
              description: 'Error deleting user in response to authrocket event.',
              body: req.body, func: 'events', obj: 'AuthrocketCtrls'
            });
            res.send('Thanks'); //Respond to authrocket post
          });
        break;
      default:
        logger.error({
          description: 'Authrocket event did not get handled.',
          body: req.body, func: 'events', obj: 'AuthrocketCtrls'
        });
    }

  } else {
    logger.error({
      description: 'Authrocket event did not have a type.',
      body: req.body, func: 'events', obj: 'AuthrocketCtrls'
    });
  }
};
function userCreated(requestData){
  logger.log({
    description: 'Authrocket user created.', data: requestData,
    func: 'userCreated', obj: 'AuthrocketCtrls'
  });
  if(!requestData.user_id){
    logger.error({
      description: 'user_id parameter is required.', data: requestData,
      func: 'userCreated', obj: 'AuthrocketCtrls'
    });
    return Promise.reject('user_id required');
  }
  var findObj = {
    authrocket:{
      id: requestData.user_id
    }
  };
  //Find account within mongo
	var query = Account.findOne(findObj);
	return query.then((accountData) => {
		if(!accountData){
			logger.log({
        message:'Account does not already exist',
        func:'userCreated', obj:'AuthrocketCtrls'
      });
      var account = new Account(findObj);
  		return account.saveNew().then((newAccount) => {
        logger.error({
          description: 'New account created from authrocket user_created event.',
          func: 'userCreated', obj: 'AuthrocketCtrls'
        });
  			return res.send('Thanks.');
  		}, (err) => {
  			logger.error({
          description: 'Error creating new account.', error: err,
          func: 'userCreated', obj: 'AuthrocketCtrls'
        });
  			// return res.status(500).send('Account could not be added.');
        return res.send('Thanks.'); //Bogus response to authrocket
  		});
		} else {
      logger.warn({
        message:'Account with matching user_id already exists.',
        func:'userCreated', obj:'AuthrocketCtrls'
      });
      return res.send('Thanks.'); //Bogus response to authrocket
		}
	}, (err) => {
		logger.error({
      message:'Error finding account data.', error:err,
      func:'userCreated', obj:'AuthrocketCtrls'
    });
		return res.status(500).send('Error getting account.');
	});
}
function userUpdated(requestData){
  logger.log({
    description: 'Authrocket user updated.', data: requestData,
    func: 'userCreated', obj: 'AuthrocketCtrls'
  });
  return new Promise((resolve, reject) => {
    resolve();
  });
}
function userDeleted(requestData){
  logger.log({
    description: 'Authrocket user deleted.', data: requestData,
    func: 'userCreated', obj: 'AuthrocketCtrls'
  });
  return new Promise((resolve, reject) => {
    resolve();
  });
}