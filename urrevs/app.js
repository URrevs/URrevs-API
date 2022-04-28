/*
  Author: Abdelrahman Hany
  Created on: 8-Apr-2022
*/

var dotenv = require('dotenv').config();
var express = require('express');
var logger = require('morgan');

// Importing config files
const config = require("./config");

// Importing DB config
const db = require("./configs/dBconfig");

// Importing firebase config
const firebase = require("./configs/firebase");


// Importing Models
const companySchema = require("./models/company");
const newPhoneSchema = require("./models/newPhone");
const phoneSchema = require("./models/phone");
const phoneSpecsSchema = require("./models/phoneSpecs");
const updateSchema = require("./models/update");
const userSchema = require("./models/user");

// Importing Routers
var indexRouter = require('./routes/index');
var userRouter = require('./routes/usersRouter');
var targetsRouter = require('./routes/targetsRouter');


// Importing rate limiter
const rateLimit = require("./utils/rateLimit");

// Importing Zone Ends Here
//-----------------------------------------------------------------------------------------

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(rateLimit);

// Applying Routers
app.use('/', indexRouter);
app.use('/users', userRouter);
app.use('/targets', targetsRouter);


module.exports = app;