/*
  Author: Abdelrahman Hany
  Created on: 5-May-2022
*/

const express = require('express');
const aiRouter = express.Router();

const authenticate = require("../utils/authenticate");
const rateLimit = require("../utils/rateLimit/regular");
const config = require("../config");

const axios = require("axios");
const https = require("https");

const CONSTANT = require("../models/constants");
const USER = require("../models/user");

// update date of the last query
aiRouter.put("/lastquery/set", rateLimit, authenticate.verifyAPIkey("X-Api-Key"), (req, res, next)=>{
    let date = req.body.date;
    if(Date.parse(date)){
      let proms = [];
      proms.push(CONSTANT.findOneAndUpdate({name: "AILastQuery"}, {$set: {date: date}}, {upsert: true}));
      proms.push(USER.updateMany({}, {$set: {currentRoundForRecommendation: 1}}));
      
      Promise.all(proms)
      .then((doc)=>{
        res.status(200).json({success: true});
      })
      .catch((err)=>{
        console.log("Error from /lastquery/set: ", err);
        return res.status(500).json({
          success: false,
          status: "process failed"
        });
      })
    }
    else{
      return res.status(400).json({
        success: false,
        status: "bad request"
      });
    }
});




// activate stopping training services
aiRouter.get("/training/services/stop", rateLimit, authenticate.verifyAPIkey("X-Api-Key"), (req, res, next)=>{
  let TIMEOUT = process.env.TIMEOUT || config.TIMEOUT;
  axios.get(process.env.AI_LINK + "/training/services/stop",
            {headers: {'X-Api-Key': process.env.AI_API_KEY}},
            {timeout: TIMEOUT, httpsAgent: new https.Agent({ keepAlive: true })})
        .then(()=>{
            console.log("Activate stopping training services (SUCCESS)..........................");
            res.sendStatus(200);
        })
        .catch((err)=>{
            console.log("Activate stopping training services (FAILURE)..........................", err);
            res.sendStatus(500);
        });
});



module.exports = aiRouter;