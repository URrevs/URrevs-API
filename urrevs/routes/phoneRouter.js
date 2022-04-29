/*
  Author: Abdelrahman Hany
  Created on: 29-Apr-2022
*/

const express = require("express");
const phoneRouter = express.Router();

const cors = require("../utils/cors");
const rateLimit = require("../utils/rateLimit");
const authenticate = require("../utils/authenticate");

const PHONE = require("../models/phone");
const PSPECS = require("../models/phoneSpecs");
const COMPANY = require("../models/company");
const CONSTANT = require("../models/constants");
const PHONEPROFILEVISIT = require("../models/phoneProfileVisit");
const PHONECOMPARISON = require("../models/phoneComparison");

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



// get the manufacturing company of a phone
phoneRouter.get("/:phoneId/company", rateLimit.regular, cors.cors, (req, res, next)=>{
    PHONE.findById(req.params.phoneId).populate("company", {name: 1})
    .then((phone)=>{
        
        if(!phone){
            res.statusCode = 404;
            res.setHeader("Content-Type", "application/json");
            res.json({success: false, status: "phone not found"});
            return;
        }

        let result = {};
        result._id = phone.company._id;
        result.name = phone.company.name;
        result.type = "company";

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.json({success: true, company: result});
    })
    .catch((err)=>{
        console.log("Error from /phones/:phoneId/company: ", err);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.json({success: false, status: "process failed"});
    })
});



// get the phone's specs
phoneRouter.get("/:phoneId/specs", rateLimit.regular, cors.cors, (req, res, next)=>{
    
    PSPECS.findById(req.params.phoneId)
    .populate("_id", {name: 1, picture: 1, company: 1})
    .then((specs)=>{

        if(!specs){
            res.statusCode = 404;
            res.setHeader("Content-Type", "application/json");
            res.json({success: false, status: "phone not found"});
            return;
        }

        // Get the name of the company
        COMPANY.findById(specs._id.company, {name: 1, _id: 0})
        .then((company)=>{
            
            let companyName;
            let companyId

            if(!company){
                companyName = null;
                companyId = null;
            }
            else{
                companyName = company.name;
                companyId = specs._id.company;
            }

            // get the currency conversion ratio
            CONSTANT.find({$or: [{name: "EURToEGP"}, {name: "USDToEUR"}]}).then((conversions)=>{
                
                let eurToEgp = null;
                let eurToUsd = null;
                
                for(let conversion of conversions){
                    if(conversion.name === "EURToEGP"){
                        eurToEgp = parseFloat(conversion.value);
                    }
                    else if(conversion.name === "USDToEUR"){
                        eurToUsd = 1 / parseFloat(conversion.value);
                    }
                }
                
                if(eurToEgp == null){
                    eurToEgp = parseFloat(process.env.EUR_TO_EGP || config.EUR_TO_EGP);
                }
                else{
                    //console.log("EURtoEGP: ", eurToEgp);
                }

                if(eurToUsd == null){
                    eurToUsd = parseFloat(process.env.EUR_TO_USD || config.EUR_TO_USD);
                }
                else{
                    //console.log("EURtoUSD: ", eurToUsd);
                }
                
                let result = {};
            
                result._id = specs._id._id;
                result.name = specs._id.name;
                result.type = "phone";
                result.picture = specs._id.picture;
                result.companyId = companyId;
                result.companyName = companyName;
                result.priceEgp = (specs.price)? (specs.price * eurToEgp) : null;
                result.priceUsd = (specs.price)? (specs.price * eurToUsd) : null;
                result.priceEur = specs.price;
                result.releaseDate =  specs.releaseDate;
                result.dimensions = specs.dimensions;
                result.network = specs.newtork;
                result.screenProtection = specs.screenProtection;
                result.os = specs.os;
                result.chipset = specs.chipset;
                result.cpu = specs.cpu;
                result.gpu = specs.gpu;
                result.externalMem = specs.exMem;
                result.internalMem = specs.intMem;
                result.mainCam = specs.mainCam;
                result.selfieCam = specs.selfieCam;
                result.loudspeaker = specs.loudspeaker;
                result.slot3p5mm = specs.slot3p5mm;
                result.wlan = specs.wlan;
                result.bluetooth = specs.bluetooth;
                result.gps = specs.gps;
                result.nfc = specs.nfc;
                result.radio = specs.radio;
                result.usb = specs.usb;
                result.sensors = specs.sensors;
                result.battery = specs.battery;
                result.charging = specs.charging;

                res.statusCode = 200;
                res.setHeader("Content-Type", "application/json");
                res.json({success: true, specs: result});
            })
            .catch((err)=>{
                console.log("Error from /phones/:phoneId/specs: ", err);
                res.statusCode = 500;
                res.setHeader("Content-Type", "application/json");
                res.json({success: false, status: "process failed"});
            });
        })
        .catch((err)=>{
            console.log("Error from /phones/:phoneId/specs: ", err);
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.json({success: false, status: "process failed"});
        });
    })
    .catch((err)=>{
        console.log("Error from /phones/:phoneId/specs: ", err);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.json({success: false, status: "process failed"});
    });
});



// get phone's stats   (increase the view count) (indicate the user has visited this phone profile)
phoneRouter.get("/:phoneId/stats", rateLimit.regular, cors.cors, 
authenticate.verifyFlexible, (req, res, next)=>{
    // increase the view count
    PHONE.findByIdAndUpdate(req.params.phoneId, {$inc: {views: 1}}, {new: false})
    .populate("company", {avgRating: 1})
    .then((phone)=>{
        
        if(!phone){
            res.statusCode = 404;
            res.setHeader("Content-Type", "application/json");
            res.json({success: false, status: "phone not found"});
            return;
        }

        if(req.user){
            // an authenticated user has triggered the tracker
            // track the activity
            PHONEPROFILEVISIT.create({
                user: req.user._id,
                phone: req.params.phoneId
            }).then((visit)=>{})
            .catch((err)=>{
                console.log("Error from /phones/:phoneId/stats: ", err);
                res.statusCode = 500;
                res.setHeader("Content-Type", "application/json");
                res.json({success: false, status: "process failed"});
            })
        }

        // get the stats of the phone then send them
        let result = {};
                
        result._id = req.params.phoneId;
        result.name = phone.name;
        result.type = "phone";
        result.views = phone.views;
        result.generalRating = phone.generalRating;
        result.companyRating = phone.company.avgRating;
        result.uiRating = phone.uiRating;
        result.manufacturingQuality = phone.manQuality;
        result.valueForMoney = phone.valFMon;
        result.camera = phone.cam;
        result.callQuality = phone.callQuality;
        result.battery = phone.batteryRating;

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.json({success: true, stats: result});
    })
    .catch((err)=>{
        console.log("Error from /phones/:phoneId/stats: ", err);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.json({success: false, status: "process failed"});
    });
});




// indicate that the user has compared between two phones
phoneRouter.put("/:phone1Id/compare/:phone2Id", rateLimit.regular, cors.cors, authenticate.verifyUser, 
(req, res, next)=>{
    PHONE.find({_id: {$in: [req.params.phone1Id, req.params.phone2Id]}}, {_id: 1}).then((phones)=>{
        
        if(phones.length != 2){
            res.statusCode = 404;
            res.setHeader("Content-Type", "application/json");
            res.json({success: false, status: "phone not found"});
            return;
        }
        else{
            PHONECOMPARISON.create({
                user: req.user._id,
                srcPhone: req.params.phone1Id,
                dstPhone: req.params.phone2Id 
            })
            .then((compare)=>{
                res.statusCode = 200;
                res.setHeader("Content-Type", "application/json");
                res.json({success: true, status: "tracked successfully"});
            })
            .catch((err)=>{
                console.log("Error from /phones/:phone1Id/compare/:phone2Id: ", err);
                res.statusCode = 500;
                res.setHeader("Content-Type", "application/json");
                res.json({success: false, status: "process failed"});
            });
        }
    })
    .catch((err)=>{
        console.log("Error from /phones/:phone1Id/compare/:phone2Id: ", err);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.json({success: false, status: "process failed"});
    });
});


module.exports = phoneRouter;