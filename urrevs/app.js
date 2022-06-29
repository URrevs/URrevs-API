/*
  Author: Abdelrahman Hany
  Created on: 8-Apr-2022
*/

const dotenv = require('dotenv').config();
const express = require('express');
const logger = require('morgan');

// Importing config files
const config = require("./config");

// Importing DB config
const db = require("./configs/dBconfig");

// Importing firebase config
const firebase = require("./configs/firebase");


// Importing Routers
const indexRouter = require('./routes/index');
const userRouter = require('./routes/usersRouter');
const targetsRouter = require('./routes/targetsRouter');
const searchRouter = require('./routes/searchRouter');
const companyRouter = require('./routes/companyRouter');
const phoneRouter = require('./routes/phoneRouter');
const reviewRouter = require('./routes/reviewRouter');
const questionRouter = require('./routes/questionsRouter');
const aIRouter = require('./routes/aiRouter');
const leaderBoardRouter = require('./routes/leaderBoardRouter');
const homeScreenRouter = require('./routes/homescreenRouter');
const miscRouter = require('./routes/miscRouter');
const reportsRouter = require('./routes/reportsRouter');


// Importing Zone Ends Here
//-----------------------------------------------------------------------------------------

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));


// Applying Routers
app.use('/', indexRouter);
app.use('/users', userRouter);
app.use('/targets', targetsRouter);
app.use('/search', searchRouter);
app.use('/companies', companyRouter);
app.use('/phones', phoneRouter);
app.use('/reviews', reviewRouter);
app.use("/questions", questionRouter);
app.use("/competitions", leaderBoardRouter);
app.use("/home", homeScreenRouter);
app.use('/ai', aIRouter);
app.use('/misc', miscRouter);
app.use('/reports', reportsRouter);


module.exports = app;