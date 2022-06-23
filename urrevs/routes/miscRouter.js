/*
  Author: Abdelrahman Hany
  Created on: 23-Jun-2022
*/

const express = require('express');
const miscRouter = express.Router();

const cors = require("../utils/cors");
const authenticate = require("../utils/authenticate");
const rateLimit = require("../utils/rateLimit/regular");

const USER = require("../models/user");
const PHONE = require("../models/phone");
const PSPECS = require("../models/phoneSpecs");
const NPHONE = require("../models/newPhone");


// preflight
miscRouter.options("*", cors.cors, (req, res, next)=>{
    res.sendStatus(200);
});



// manual phone addition




module.exports = miscRouter;