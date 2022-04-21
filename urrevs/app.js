/*
  Author: Abdelrahman Hany
  Created on: 8-Apr-2022
*/

var dotenv = require('dotenv').config();
var express = require('express');
var logger = require('morgan');
const cors = require('cors');

// Importing config files


// Importing DB config
const db = require("./configs/dBconfig");


// Importing Models
const companySchema = require("./models/company");
const newPhoneSchema = require("./models/newPhone");
const phoneSchema = require("./models/phone");
const phoneSpecsSchema = require("./models/phoneSpecs");
const updateSchema = require("./models/update");

// Importing Routers
var indexRouter = require('./routes/index');
var targetsRouter = require('./routes/targetsRouter');


// Importing Zone Ends Here
//-----------------------------------------------------------------------------------------

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors({origin: "*"})); // TODO: (PRODUCTION) Change this to the domain of the web frontend (https://urrevs.com)


// Applying Routers
app.use('/', indexRouter);
app.use('/targets', targetsRouter);


module.exports = app;