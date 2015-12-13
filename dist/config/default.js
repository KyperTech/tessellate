"use strict";

var env = process.env.NODE_ENV;
var config = undefined;
switch (env) {
	case "local":
		config = require("./env/local");
		break;
	case "development":
		config = require("./env/development");
		break;
	case "staging":
		config = require("./env/staging");
		break;
	case "production":
		config = require("./env/production");
		break;
	case "test":
		config = require("./env/test");
		break;
	default:
		console.log('-----------Setting default config');
		config = require("./env/production");
		break;
}

exports.config = config;