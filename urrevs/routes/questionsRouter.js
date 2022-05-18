/*
  Author: Abdelrahman Hany
  Created on: 18-May-2022
*/

const express = require("express");
const questionRouter = express.Router();

const cors = require("../utils/cors");
const rateLimit = require("../utils/rateLimit/regular");
const authenticate = require("../utils/authenticate");

const USER = require("../models/user");
const PHONE = require("../models/phone");
const PQUES = require("../models/phoneQuestion");
const PANS = require("../models/phoneAnswer");
const CQUES = require("../models/companyQuestion");
const CANS = require("../models/companyAnswer");



// preflight
questionRouter.options("*", cors.cors, (req, res, next)=>{
    res.sendStatus(200);
});


// add a phone question
questionRouter.post("/phone", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
  
});










module.exports = questionRouter