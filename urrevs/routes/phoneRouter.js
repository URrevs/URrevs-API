/*
  Author: Abdelrahman Hany
  Created on: 29-Apr-2022
*/

const express = require("express");
const phoneRouter = express.Router();

const cors = require("../utils/cors");
const rateLimit = require("../utils/rateLimit");

const PHONE = require("../models/phone");
const config = require("../config");

//--------------------------------------------------------------------

// Endpoints Implementation


// list all phones
phoneRouter.get("/all", rateLimit.regular, cors.cors, (req, res, next) => {
    let itemsPerRound = parseInt((process.env.ALL_PHONES_PER_ROUND|| config.ALL_PHONES_PER_ROUND));
    let roundNum = req.query.round;
    if(!roundNum){
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.json({success: false, status: "bad request"});
        return;
    }

    PHONE.find({})
    .sort({createdAt: -1})
    .skip((roundNum - 1) * itemsPerRound)
    .limit(itemsPerRound).then((phones) => {
        let result = [];
        for(let phone of phones){
            result.push({
                _id: phone._id,
                name: phone.name,
                type: "phone"
            });
        }
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.json({success: true, phones: result});
    })
    .catch((err)=>{
        console.log("Error from /phones/all: ", err);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.json({success: false, status: "process failed"});
    });
});



// list all phones from a specific company
phoneRouter.get("/by/:compId", rateLimit.regular, cors.cors, (req, res, next)=>{
    let itemsPerRound = parseInt((process.env.PHONES_BY_COMPANY_PER_ROUND|| config.PHONES_BY_COMPANY_PER_ROUND));
    let roundNum = req.query.round;
    if(!roundNum){
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.json({success: false, status: "bad request"});
        return;
    }

    PHONE.find({company: req.params.compId})
    .sort({createdAt: -1})
    .skip((roundNum - 1) * itemsPerRound)
    .limit(itemsPerRound)
    .then((phones) => {
        let result = [];
        for(let phone of phones){
            result.push({
                _id: phone._id,
                name: phone.name,
                type: "phone"
            });
        }
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.json({success: true, phones: result});
    })
    .catch((err)=>{
        console.log("Error from /phones/by/:compId: ", err);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.json({success: false, status: "process failed"});
    })
});


module.exports = phoneRouter;