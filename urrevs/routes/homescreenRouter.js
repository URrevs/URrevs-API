/*
  Author: Abdelrahman Hany
  Created on: 21-May-2022
*/

const express = require("express");
const axios = require("axios");
const https = require("https");

const homeRouter = express.Router();

const cors = require("../utils/cors");
const rateLimit = require("../utils/rateLimit/regular");
const authenticate = require("../utils/authenticate");

const PREVS = require("../models/phoneReview");
const CREVS = require("../models/companyReview");
const PQUES = require("../models/phoneQuestion");
const CQUES = require("../models/companyQuestion");


// preflight
homeRouter.options("*", cors.cors, (req, res) => {
    res.sendStatus(200);
});




// get recommended reviews and questions
homeRouter.get("/recommended", cors.cors, rateLimit, authenticate.verifyFlexible, async(req, res, next) => {
    if(req.user){
        // get recommendations for authenticated user
        try{
            let TIMEOUT = process.env.TIMEOUT || config.TIMEOUT;
            let roundNum = req.query.round;

            if(roundNum == null || isNaN(roundNum)){
                res.statusCode = 400;
                res.setHeader("Content-Type", "application/json");
                res.json({success: false, status: "bad request"});
                return;
            }

            const {data: resp} = await axios.get(process.env.AI_LINK + "/all/" + req.user._id + "/recommend",
            {headers: {'X-Api-Key': process.env.AI_API_KEY}, params: {"round": roundNum}},
            {timeout: TIMEOUT, httpsAgent: new https.Agent({ keepAlive: true })});

            let pRevs = resp.phoneRevs;
            let cRevs = resp.companyRevs;
            let pQues = resp.phoneQuestions;
            let cQues = resp.companyQuestions;
            
            let proms = [];
            proms.push(PREVS.find({_id: {$in: pRevs}}));
            proms.push(CREVS.find({_id: {$in: cRevs}}));
            proms.push(PQUES.find({_id: {$in: pQues}}));
            proms.push(CQUES.find({_id: {$in: cQues}}));

            Promise.all(proms)
            .then(([pRevs, cRevs, pQues, cQues]) => {

            })
            .catch((err)=>{
                console.log("Error from GET /home/recommended: ", err);
                return res.status(500).json({
                  success: false,
                  status: "internal server error",
                  err: "finding the documents failed"
                });
            });

        }
        catch(err){
            // Apply backup routine
            console.log(err);
        }
    }
    else{
        // get recommendations for unauthenticated user
    }
});



module.exports = homeRouter;