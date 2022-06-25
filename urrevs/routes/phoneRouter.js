/*
  Author: Abdelrahman Hany
  Created on: 29-Apr-2022
*/

const express = require("express");
const axios = require("axios");
const https = require("https");

const useragent = require("express-useragent");
const useragentParser = require('ua-parser-js');

const phoneRouter = express.Router();

const cors = require("../utils/cors");
const rateLimit = require("../utils/rateLimit/regular");
const authenticate = require("../utils/authenticate");
const mapUaToPhones = require("../utils/mapUaToPhones");

const PHONE = require("../models/phone");
const PSPECS = require("../models/phoneSpecs");
const COMPANY = require("../models/company");
const CONSTANT = require("../models/constants");
const PHONEPROFILEVISIT = require("../models/phoneProfileVisit");
const PHONECOMPARISON = require("../models/phoneComparison");
const OWNED_PHONE = require("../models/ownedPhone");
const PHONEREV = require("../models/phoneReview");
const COMPANYREV = require("../models/companyReview");

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
    .then(async (phone)=>{
        
        if(!phone){
            res.statusCode = 404;
            res.setHeader("Content-Type", "application/json");
            res.json({success: false, status: "phone not found"});
            return;
        }

        let owned = false;
        let verificationRatio = 0;

        if(req.user){
            // an authenticated user has triggered the tracker
            // track the activity
            // check if the phone is owned by the user or not
            let proms = [];

            proms.push(OWNED_PHONE.findOne({user: req.user._id, phone: req.params.phoneId}, {verificationRatio: 1}));
            proms.push(PHONEPROFILEVISIT.findOneAndUpdate({user: req.user._id, phone: req.params.phoneId}, {$inc: {times: 1}}, {upsert: true}));
            

            let outs = null;

            try{
                outs = await Promise.all(proms);
                owned = (outs[0]) ? true : false;
                verificationRatio = (outs[0]) ? (outs[0].verificationRatio) : 0;
            }
            catch(err){
                console.log("Error from /phones/:phoneId/stats: ", err);
                return res.status(500).json({success: false, status: "process failed"});
            }
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
        result.owned = owned;
        result.verificationRatio = verificationRatio;

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



// get similar phones given user agent
/*
    steps:
        1- get the user agent
        2- check if the user agent doesn't correspond to pc nor iphone --> if violated, return empty array
        3- get the model name from the user agent
        4- search the phones that have the same model name (with rounding)
        5- check the returned phones --> if not empty, return the phones
        6- if the returned phones is empty, do the following:
            6.1- send the user agent to the specialized api --> in case of request failure, return empty array
            6.2- receive the brand and name of the phone
            6.3- apply updateMany to the phones collection to the phones matching the brand and name
            6.4- return those phones
*/
phoneRouter.get("/my/approx", cors.cors, rateLimit, authenticate.verifyFlexible, (req, res, next)=>{
    let itemsPerRound = parseInt((process.env.APPROX_PHONES_PER_ROUND || config.APPROX_PHONES_PER_ROUND));
    let roundNum = req.query.round;
  
    if(roundNum == null || isNaN(roundNum)){
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.json({success: false, status: "bad request"});
        return;
    }

    let uA = req.headers['user-agent'];
    let uAObj = useragent.parse(uA);
    
    if(uAObj.isMobile && !uAObj.isiPhone){
        try{
            
            // get the model name
            let parsedUa = useragentParser(uA);
            let modelName = "," + parsedUa.device.model + ",";

            let proms = [];
            proms.push(PHONE.find({otherNames: {$regex: modelName, $options: "i"}}, {name: 1, picture: 1, company: 1}).skip((roundNum - 1) * itemsPerRound).limit(itemsPerRound).populate("company", {name: 1}));
            if(req.user){
                proms.push(OWNED_PHONE.find({user: req.user._id}, {phone: 1, _id: 0}));
            }
            
            Promise.all(proms).then(async(results)=>{
                let phonesDocs = results[0];

                let result = [];
                for(let phone of phonesDocs){
                    result.push({
                        _id: phone._id,
                        name: phone.name,
                        picture: phone.picture,
                        companyId: phone.company._id,
                        companyName: phone.company.name,
                        type: "phone"
                    });
                }

                // phone model name is not found in the phones collection
                if(result.length == 0 && roundNum == 1){
                    try{
                        result = await mapUaToPhones(uA, modelName, itemsPerRound, roundNum);
                    }
                    catch(err){
                        if(err != 404){
                            console.log("Error from /phones/my/approx: ", err);
                            return res.status(500).json({success: false, status: "internal server error"});
                        }
                        
                        return res.status(200).json({success: true, phones: []});
                    }
                }

                if(req.user){
                    let ownedPhonesDocs = results[1];

                    let ownedPhones = {};
                    for(let phoneDoc of ownedPhonesDocs){
                        ownedPhones[phoneDoc.phone] = true;
                    }
                    // remove the owned phones from the result
                    for(let [index, phone] of result.entries()){
                        if(ownedPhones[phone._id]){
                            result.splice(index, 1);
                        }
                    }
                }

                return res.status(200).json({success: true, phones: result});
            })
            .catch((err)=>{
                console.log("Error from /phones/my/approx: ", err);
                return res.status(500).json({success: false, status: "internal server error"});
            });
        }
        catch(err){
            console.log("Error from /phones/my/approx: ", err);
            return res.status(500).json({success: false, status: "internal server error"});
        }
    }
    else{
        return res.status(200).json({success: true, phones: []});
    }
});




// verify an owned phone with its corresponding reviews
/*
    steps:
        1- obtain the user agent
        2- check if the user agent corresponds to a mobile device else return an error
        3- check if the phone exists and is owned by the user
        4- if the user agent is for an iphone
            4.1- if the phone is an iphone, set verificationRatio to -1 and return
            4.2- if the phone is not an iphone, set verificationRatio to 0 and return
        5- if the user agent is not for an iphone
            5.1- obtain the model name
            5.2- search the phones that have the same model name
            5.3- check the result list
                5.3.1- if empty, set verificationRatio to 0 and return
                5.3.2- if not empty
                    5.3.2.1- loop over the result list
                    5.3.2.2- if the phone is found in the list, set verificationRatio to (1 / result list length) * 100, then return else, set verificationRatio to 0 and return
*/
phoneRouter.put("/:phoneId/verify", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
    let uA = req.headers['user-agent'];
    let uAObj = useragent.parse(uA);

    if(!uAObj.isMobile){
        return res.status(400).json({success: false, status: "not mobile"});
    }

    let proms1 = [];
    proms1.push(PHONEREV.findOne({user: req.user._id, phone: req.params.phoneId}, {_id: 1, phone: 1}).populate("phone", {name: 1}));

    Promise.all(proms1)
    .then(async(results)=>{
        let rev = results[0];

        if(rev == null){
            return res.status(403).json({success: false, status: "phone not found or not owned"});
        }

        let verificationRatio = 0;

        if(uAObj.isiPhone){
            if(rev.phone.name.match(/^Apple/gi)){
                verificationRatio = -1;
            }
        }
        else{
            let parsedUa = useragentParser(uA);
            let modelName = "," + parsedUa.device.model + ",";

            let phones;
            try{
                phones = await PHONE.find({otherNames: {$regex: modelName, $options: "i"}}, {name: 1});
                for(let phone of phones){
                    if(phone.name == rev.phone.name){
                        verificationRatio = (1 / phones.length) * 100;
                        break;
                      }
                }
            }
            catch(err){
                console.log("Error from /phones/:phoneId/verify: ", err);
                return res.status(500).json({success: false, status: "error finding the matched phones"});
            }
        }

        // update the verification ratio in the owned phones, phone reviews, company reviews
        rev.verificationRatio = verificationRatio;
        let proms2 = [];
        proms2.push(rev.save());
        proms2.push(OWNED_PHONE.findOneAndUpdate({user: req.user._id, phone: req.params.phoneId}, {$set: {verificationRatio: verificationRatio}}));
        proms2.push(COMPANYREV.findOneAndUpdate({corresPrev: rev._id}, {$set: {verificationRatio: verificationRatio}}));
    
        Promise.all(proms2)
        .then((results2)=>{
            return res.status(200).json({success: true, verificationRatio: verificationRatio});
        })
        .catch((err)=>{
            console.log("Error from /phones/:phoneId/verify: ", err);
            return res.status(500).json({success: false, status: "error updating the verification ratio"});
        });
    })
    .catch((err)=>{
        console.log("Error from /phones/:phoneId/verify: ", err);
        return res.status(500).json({success: false, status: "error finding the phone"});
    });

});



module.exports = phoneRouter;