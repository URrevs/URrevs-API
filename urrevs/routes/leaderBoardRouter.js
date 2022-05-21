/*
  Author: Abdelrahman Hany
  Created on: 21-May-2022
*/

const express = require("express");
const leaderBoardRouter = express.Router();

const cors = require("../utils/cors");
const rateLimit = require("../utils/rateLimit/regular");

const COMPETITION = require("../models/competition");
const USER = require("../models/user");


// preflight
leaderBoardRouter.options("*", cors.cors, (req, res, next)=>{
    res.sendStatus(200);
});






module.exports = leaderBoardRouter;