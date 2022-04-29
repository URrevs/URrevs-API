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
const uproductsSchema = require("./models/uproducts");
const ownedPhonesSchema = require("./models/ownedPhone");

// Importing Routers
var indexRouter = require('./routes/index');
var userRouter = require('./routes/usersRouter');
var targetsRouter = require('./routes/targetsRouter');
var searchRouter = require('./routes/searchRouter');
var companyRouter = require('./routes/companyRouter');


// Importing Zone Ends Here
//-----------------------------------------------------------------------------------------

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));


// Applying Routers
app.use('/', indexRouter);
app.use('/users', userRouter);
app.use('/targets', targetsRouter);
app.use('/search', searchRouter);
app.use('/companies', companyRouter);


module.exports = app;