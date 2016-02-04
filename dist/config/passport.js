'use strict';

/*!
 * Module dependencies.
 */

var mongoose = require('mongoose');
var User = mongoose.model('User');

var local = require('./passport/local');
var google = require('./passport/google');
var github = require('./passport/github');
var jwt = require('./passport/jwt');

/**
 * Expose
 */

module.exports = function (passport) {

  // serialize sessions
  passport.serializeUser(function (user, cb) {
    return cb(null, user.id);
  });
  passport.deserializeUser(function (id, cb) {
    return User.load({ criteria: { _id: id } }, cb);
  });

  // use these strategies
  passport.use(local);
  passport.use(google);
  passport.use(jwt);
  // passport.use(github);
};