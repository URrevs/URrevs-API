var express = require('express');
var logger = require('morgan');

// Importing config files


// Importing DB config
const db = require("./configs/dBconfig");


// Importing Models


// Importing Routers
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');


// Importing Zone Ends Here
//-----------------------------------------------------------------------------------------

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Applying Routers
app.use('/', indexRouter);
app.use('/users', usersRouter);

module.exports = app;
