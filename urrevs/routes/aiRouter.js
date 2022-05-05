/*
  Author: Abdelrahman Hany
  Created on: 5-May-2022
*/

const express = require('express');
const aiRouter = express.Router();

const authenticate = require("../utils/authenticate");

const CONSTANT = require("../models/constants");

// update date of the last query
aiRouter.put("/lastquery/set", authenticate.verifyAPIkey("X-Api-Key"), (req, res, next)=>{
    let date = req.body.date;
    if(Date.parse(date)){
      CONSTANT.findOneAndUpdate({name: "AILastQuery"}, {$set: {date: date}}, {upsert: true})
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


module.exports = aiRouter;