/*
  Author: Abdelrahman Hany
  Created on: 29-Apr-2022
*/

const express = require("express");
const axios = require("axios");
const https = require("https");

const phoneRouter = express.Router();

const cors = require("../utils/cors");
const rateLimit = require("../utils/rateLimit/regular");
const authenticate = require("../utils/authenticate");

const PHONE = require("../models/phone");
const PSPECS = require("../models/phoneSpecs");
const COMPANY = require("../models/company");
const CONSTANT = require("../models/constants");
const PHONEPROFILEVISIT = require("../models/phoneProfileVisit");
const PHONECOMPARISON = require("../models/phoneComparison");

const config = require("../config");

//--------------------------------------------------------------------

phoneRouter.options("*", cors.cors, (req, res, next)=>{
    res.sendStatus(200);
  });

// Endpoints Implementation


// list all phones
phoneRouter.get("/all", cors.cors, rateLimit, (req, res, next) => {
    let itemsPerRound = parseInt((process.env.ALL_PHONES_PER_ROUND|| config.ALL_PHONES_PER_ROUND));
    let roundNum = req.query.round;
    if(!roundNum || isNaN(roundNum)){
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.json({success: false, status: "bad request"});
        return;
    }

    PHONE.find({})
    .sort({createdAt: -1})
    .skip((roundNum - 1) * itemsPerRound)
    .limit(itemsPerRound).populate("company", {picture: 1, _id: 0}).then((phones) => {
        let result = [];
        for(let phone of phones){
            result.push({
                _id: phone._id,
                name: phone.name,
                type: "phone",
                companyLogo: phone.company.picture
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
phoneRouter.get("/by/:compId", cors.cors, rateLimit, (req, res, next)=>{
    let itemsPerRound = parseInt((process.env.PHONES_BY_COMPANY_PER_ROUND|| config.PHONES_BY_COMPANY_PER_ROUND));
    let roundNum = req.query.round;
    if(!roundNum || isNaN(roundNum)){
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.json({success: false, status: "bad request"});
        return;
    }

    PHONE.find({company: req.params.compId})
    .sort({createdAt: -1})
    .skip((roundNum - 1) * itemsPerRound)
    .limit(itemsPerRound).populate("company", {picture: 1, _id: 0})
    .then((phones) => {
        let result = [];
        for(let phone of phones){
            result.push({
                _id: phone._id,
                name: phone.name,
                type: "phone",
                companyLogo: phone.company.picture
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
phoneRouter.get("/:phoneId/company", cors.cors, rateLimit, (req, res, next)=>{
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
phoneRouter.get("/:phoneId/specs", cors.cors, rateLimit, (req, res, next)=>{
    
    PSPECS.findById(req.params.phoneId)
    .populate("_id", {name: 1, picture: 1, company: 1})
    .then((specs)=>{

        if(!specs){
            res.statusCode = 404;
            res.setHeader("Content-Type", "application/json");
            res.json({success: false, status: "phone not found"});
            return;
        }

        let proms = [];
        proms.push(COMPANY.findById(specs._id.company, {name: 1, _id: 0}));
        proms.push(CONSTANT.find({$or: [{name: "EURToEGP"}/*, {name: "USDToEUR"}, {name: "INRToEUR"}, {name: "GBPToEUR"}*/]}));

        Promise.all(proms)
        .then((values)=>{
            let company = values[0];
            let conversions = values[1];

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

            let eurToEgp = null;
            // let eurToUsd = null;
            // let eurToInr = null;
            // let eurToGbp = null;
            
            for(let conversion of conversions){
                if(conversion.name === "EURToEGP"){
                    eurToEgp = parseFloat(conversion.value);
                }
                // else if(conversion.name === "USDToEUR"){
                //     eurToUsd = 1 / parseFloat(conversion.value);
                // }
                // else if(conversion.name === "INRToEUR"){
                //     eurToInr = 1 / parseFloat(conversion.value);
                // }
                // else if(conversion.name === "GBPToEUR"){
                //     eurToGbp = 1 / parseFloat(conversion.value);
                // }
            }
            
            if(eurToEgp == null){
                eurToEgp = parseFloat(process.env.EUR_TO_EGP || config.EUR_TO_EGP);
            }
            else{
                //console.log("EURtoEGP: ", eurToEgp);
            }

            // if(eurToUsd == null){
            //     eurToUsd = parseFloat(process.env.EUR_TO_USD || config.EUR_TO_USD);
            // }
            // else{
            //     //console.log("EURtoUSD: ", eurToUsd);
            // }

            // if(eurToInr == null){
            //     eurToInr = 1 / parseFloat(process.env.INR_TO_EUR || config.INR_TO_EUR);
            // }
            // else{
            //     //console.log("INRtoEUR: ", eurToInr);
            // }

            // if(eurToGbp == null){
            //     eurToGbp = 1 / parseFloat(process.env.GBP_TO_EUR || config.GBP_TO_EUR);
            // }
            // else{
            //     //console.log("GBPtoEUR: ", eurToGbp);
            // }
            
            let result = {};
        
            result._id = specs._id._id;
            result.name = specs._id.name;
            result.type = "phone";
            result.picture = specs._id.picture;
            result.companyId = companyId;
            result.companyName = companyName;
            result.priceEgp = (specs.price)? (specs.price * eurToEgp) : null;
            // result.priceUsd = (specs.price)? (specs.price * eurToUsd) : null;
            // result.priceInr = (specs.price)? (specs.price * eurToInr) : null;
            // result.priceGbp = (specs.price)? (specs.price * eurToGbp) : null;
            // result.priceEur = specs.price;
            result.releaseDate =  specs.releaseDate;
            result.dimensions = specs.dimensions;
            result.network = specs.newtork;
            result.screenType = specs.screenType;
            result.screenSize = specs.screenSize;
            result.screenResolution = specs.screenResolution;                
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
            result.weight = specs.weight;
            result.sim = specs.sim;

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
});



// get phone's stats   (increase the view count) (indicate the user has visited this phone profile)
phoneRouter.get("/:phoneId/stats", cors.cors, rateLimit, 
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
            PHONEPROFILEVISIT.findOneAndUpdate({
                user: req.user._id,
                phone: req.params.phoneId
            }, {$inc: {times: 1}}, {upsert: true}).then((visit)=>{})
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
phoneRouter.put("/:phone1Id/compare/:phone2Id", cors.cors, rateLimit, authenticate.verifyUser, 
(req, res, next)=>{
    PHONE.find({_id: {$in: [req.params.phone1Id, req.params.phone2Id]}}, {_id: 1}).then((phones)=>{
        
        if(phones.length != 2){
            res.statusCode = 404;
            res.setHeader("Content-Type", "application/json");
            res.json({success: false, status: "phone not found"});
            return;
        }
        else{
            PHONECOMPARISON.findOneAndUpdate({
                user: req.user._id,
                srcPhone: req.params.phone1Id,
                dstPhone: req.params.phone2Id 
            }, {$inc: {times: 1}}, {upsert: true})
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




// get similar phones to the given phone
phoneRouter.get("/:phoneId/similar", cors.cors, rateLimit, (req, res, next)=>{
    PHONE.findById(req.params.phoneId, {_id: 1}).then(async (phone)=>{

        // if the phone doesn't exist, abort
        if(!phone){
            res.statusCode = 404;
            res.setHeader("Content-Type", "application/json");
            res.json({success: false, status: "phone not found"});
            return;
        }

        // first let's try to contact the AI service
        try{
            let TIMEOUT = process.env.TIMEOUT || config.TIMEOUT;
            
            const {data: resp} = await axios.get(process.env.AI_LINK + "/phones/" + phone._id + "/recommend",
            {headers: {'X-Api-Key': process.env.AI_API_KEY}},
            {timeout: TIMEOUT, httpsAgent: new https.Agent({ keepAlive: true })});

            let similar_ids = resp.similiar_phones;
            
            PHONE.find({_id: {$in: similar_ids}}, {name: 1, picture: 1}).then((phones)=>{
                let result = [];
                let resultObj = {};
                for(let [index, phone] of phones.entries()){
                    resultObj[phone._id] = index;
                    result.push({
                        _id: phone._id,
                        name: phone.name,
                        picture: phone.picture,
                        type: "phone"
                    });
                }

                // sort the result by the the order in similar_ids
                let resultSorted = [];
                for(let id of similar_ids){
                    resultSorted.push(result[resultObj[id]]);
                }
                
                console.log("--------------------Similar phones is done by AI--------------------")

                res.statusCode = 200;
                res.setHeader("Content-Type", "application/json");
                res.json({success: true, phones: resultSorted});
            })
            .catch((err)=>{
                console.log("Error from ai way /phones/:phoneId/similar: ", err);
                res.statusCode = 500;
                res.setHeader("Content-Type", "application/json");
                res.json({success: false, status: "process failed"});
            });
        }
        catch(err){
            console.log("--------------------Similar phones AI failed--------------------");
            console.log(err.response.status, err.response.data);
            // Now, let's do it my way

            // get the release date of the phone
            PSPECS.findOne({_id: phone._id}, {releaseDate: 1, price: 1, _id: 0}).then((currentPhone)=>{

                // if the current phone doesn't exist in nphones, abort
                if(!currentPhone){
                    console.log("Error from my way /phones/:phoneId/similar: the phone does not exist in nphones");
                    res.statusCode = 500;
                    res.setHeader("Content-Type", "application/json");
                    res.json({success: false, status: "process failed"});
                    return;
                }

                // make sure that the phones has a price and a release date
                if(!currentPhone.price){
                    res.statusCode = 200;
                    res.setHeader("Content-Type", "application/json");
                    res.json({success: true, phones: [], status: "the phone does not have price"});
                    return;
                }

                if(!currentPhone.releaseDate){
                    res.statusCode = 200;
                    res.setHeader("Content-Type", "application/json");
                    res.json({success: true, phones: [], status: "the phone does not have release date"});
                    return;
                }

                // get the current phone's price and the year of its release
                let price = currentPhone.price;
                let price20Percent = price * 0.2;
                let upperLimit = (price + price20Percent);
                let lowerLimit = (price - price20Percent);
                let year = currentPhone.releaseDate.split(" ")[0];

               
                /*
                    get all phones that have the same year of release and the price difference 
                    is less than or equal to 20% of the current phone's price
                */

                PSPECS.aggregate([
                    {$match: {releaseDate: {$regex: year}, price: {$ne: null}, _id: {$ne: phone._id}}},
                    {$project: {_id: 1, price: 1, releaseDate: 1}},
                    {$match: {price: {$gt: lowerLimit, $lt: upperLimit}}},
                    {$sort: {price: -1}},
                    {$limit: 20},
                ])
                .then((sortedSimilarPhones)=>{
                    // extract the ids of the similar phones
                    let similarIds = [];
                    for(phone of sortedSimilarPhones){
                        similarIds.push(phone._id);
                    }

                    // get the similar phones
                    PHONE.find({_id: {$in: similarIds}}, {name: 1, picture: 1}).then((phones)=>{
                        
                        let result = [];
                        for(phone of phones){
                            result.push({
                                _id: phone._id,
                                name: phone.name,
                                picture: phone.picture,
                                type: "phone"
                            });
                        }

                        console.log("--------------------Similar phones is done by my way--------------------")

                        res.statusCode = 200;
                        res.setHeader("Content-Type", "application/json");
                        res.json({success: true, phones: result}); 
                    })
                    .catch((err)=>{
                        console.log("Error from my way /phones/:phoneId/similar: ", err);
                        res.statusCode = 500;
                        res.setHeader("Content-Type", "application/json");
                        res.json({success: false, status: "process failed"});
                    });
                })
                .catch((err)=>{
                    console.log("Error from my way /phones/:phoneId/similar: ", err);
                    res.statusCode = 500;
                    res.setHeader("Content-Type", "application/json");
                    res.json({success: false, status: "process failed"});
                });
            })
            .catch((err)=>{
                console.log("Error from my way /phones/:phoneId/similar: ", err);
                res.statusCode = 500;
                res.setHeader("Content-Type", "application/json");
                res.json({success: false, status: "process failed"});
            });
        }
    }).catch((err)=>{
        console.log("Error from /phones/:phoneId/similar: ", err);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.json({success: false, status: "process failed"});
    });
});


module.exports = phoneRouter;