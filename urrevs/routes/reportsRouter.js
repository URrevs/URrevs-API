/*
  Author: Abdelrahman Hany
  Created on: 29-Jun-2022
*/

const express = require("express");

const reportRouter = express.Router();

const cors = require("../utils/cors");
const rateLimit = require("../utils/rateLimit/regular");
const authenticate = require("../utils/authenticate");

const USER = require("../models/user");
const PHONEREV = require("../models/phoneReview");
const COMPANYREV = require("../models/companyReview");
const PHONE_REVS_COMMENTS = require("../models/phoneReviewComment");
const COMPANY_REVS_COMMENTS = require("../models/companyReviewComment");
const PQUES = require("../models/phoneQuestion");
const PANS = require("../models/phoneAnswer");
const CQUES = require("../models/companyQuestion");
const CANS = require("../models/companyAnswer");
const REPORT = require("../models/report");



//const config = require("../config");

//--------------------------------------------------------------------

reportRouter.options("*", cors.cors, (req, res, next)=>{
  res.sendStatus(200);
});


/*
    Report a review or a question
    Steps:
        1- check if the review exists
        2- check if the review is already reported by the user
        3- check if the review is not owned by the user
        4- create the report document
        5- return
*/

// report a phone review
reportRouter.post("/review/phone/:revId", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
    
    const reason = req.body.reason;

    if(!reason){
        return res.status(400).json({
            success: false,
            status: "bad request"
        });
    }

    if(typeof reason !== "number"){
        return res.status(400).json({
            success: false,
            status: "bad request"
        });
    }

    if(!(reason == 1 || reason == 2 || reason == 3 || reason == 4 || reason == 5 || reason == 6)){
        return res.status(400).json({
            success: false,
            status: "bad request"
        });
    }

    if(req.body.info){
        if(typeof req.body.info !== "string"){
            return res.status(400).json({
                success: false,
                status: "bad request"
            });
        }
    }

    // let stringReason = "";
    // switch(reason){
    //     case 1: stringReason = "disturbance"; break;
    //     case 2: stringReason = "violence"; break;
    //     case 3: stringReason = "harassment"; break;
    //     case 4: stringReason = "hate"; break;
    //     case 5: stringReason = "porn"; break;
    //     case 6: stringReason = "other"; break;
    // }


    if(req.user.blockedFromReviews){
        return res.status(403).json({
            success: false,
            status: "blocked"
        });
    }
    
    let proms = [];
    proms.push(PHONEREV.findOne({_id: req.params.revId, user: {$ne: req.user._id}}, {user: 1}));
    proms.push(REPORT.findOne({reporter: req.user._id, obj: req.params.revId, type: "phoneReview"}));

    Promise.all(proms)
    .then((results)=>{
        let rev = results[0];
        let rep = results[1];

        if(!rev){
            return res.status(404).json({
                success: false,
                status: "not found or you own it"
            });
        }

        if(rep){
            return res.status(403).json({
                success: false,
                status: "already reported"
            });
        }

        // create the report document
        REPORT.create({
            reporter: req.user._id,
            reportee: rev.user,
            type: "phoneReview",
            reason: reason,
            info: req.body.info,
            obj: req.params.revId,
            onModelObj: "pRev"
        })
        .then((r)=>{
            return res.status(200).json({
                success: true
            });
        })
        .catch((err)=>{
            console.log("Error from /reports/review/phone/:revId: ", err);
            return res.status(500).json({
                success: false,
                status: "error creating the report"
            });
        });
    })
    .catch((err)=>{
        console.log("Error from /reports/review/phone/:revId: ", err);
        return res.status(500).json({
            success: false,
            status: "erro finding the review or the report"
        });
    });
});




// report a company review
reportRouter.post("/review/company/:revId", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
    
    const reason = req.body.reason;

    if(!reason){
        return res.status(400).json({
            success: false,
            status: "bad request"
        });
    }

    if(typeof reason !== "number"){
        return res.status(400).json({
            success: false,
            status: "bad request"
        });
    }

    if(!(reason == 1 || reason == 2 || reason == 3 || reason == 4 || reason == 5 || reason == 6)){
        return res.status(400).json({
            success: false,
            status: "bad request"
        });
    }

    if(req.body.info){
        if(typeof req.body.info !== "string"){
            return res.status(400).json({
                success: false,
                status: "bad request"
            });
        }
    }

    // let stringReason = "";
    // switch(reason){
    //     case 1: stringReason = "disturbance"; break;
    //     case 2: stringReason = "violence"; break;
    //     case 3: stringReason = "harassment"; break;
    //     case 4: stringReason = "hate"; break;
    //     case 5: stringReason = "porn"; break;
    //     case 6: stringReason = "other"; break;
    // }


    if(req.user.blockedFromReviews){
        return res.status(403).json({
            success: false,
            status: "blocked"
        });
    }
    
    let proms = [];
    proms.push(COMPANYREV.findOne({_id: req.params.revId, user: {$ne: req.user._id}}, {user: 1}));
    proms.push(REPORT.findOne({reporter: req.user._id, obj: req.params.revId, type: "companyReview"}));

    Promise.all(proms)
    .then((results)=>{
        let rev = results[0];
        let rep = results[1];

        if(!rev){
            return res.status(404).json({
                success: false,
                status: "not found or you own it"
            });
        }

        if(rep){
            return res.status(403).json({
                success: false,
                status: "already reported"
            });
        }

        // create the report document
        REPORT.create({
            reporter: req.user._id,
            reportee: rev.user,
            type: "companyReview",
            reason: reason,
            info: req.body.info,
            obj: req.params.revId,
            onModelObj: "cRev"
        })
        .then((r)=>{
            return res.status(200).json({
                success: true
            });
        })
        .catch((err)=>{
            console.log("Error from /reports/review/company/:revId: ", err);
            return res.status(500).json({
                success: false,
                status: "error creating the report"
            });
        });
    })
    .catch((err)=>{
        console.log("Error from /reports/review/company/:revId: ", err);
        return res.status(500).json({
            success: false,
            status: "erro finding the review or the report"
        });
    });
});



// report a phone question
reportRouter.post("/question/phone/:quesId", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
    
    const reason = req.body.reason;

    if(!reason){
        return res.status(400).json({
            success: false,
            status: "bad request"
        });
    }

    if(typeof reason !== "number"){
        return res.status(400).json({
            success: false,
            status: "bad request"
        });
    }

    if(!(reason == 1 || reason == 2 || reason == 3 || reason == 4 || reason == 5 || reason == 6)){
        return res.status(400).json({
            success: false,
            status: "bad request"
        });
    }

    if(req.body.info){
        if(typeof req.body.info !== "string"){
            return res.status(400).json({
                success: false,
                status: "bad request"
            });
        }
    }

    // let stringReason = "";
    // switch(reason){
    //     case 1: stringReason = "disturbance"; break;
    //     case 2: stringReason = "violence"; break;
    //     case 3: stringReason = "harassment"; break;
    //     case 4: stringReason = "hate"; break;
    //     case 5: stringReason = "porn"; break;
    //     case 6: stringReason = "other"; break;
    // }


    if(req.user.blockedFromReviews){
        return res.status(403).json({
            success: false,
            status: "blocked"
        });
    }
    
    let proms = [];
    proms.push(PQUES.findOne({_id: req.params.quesId, user: {$ne: req.user._id}}, {user: 1}));
    proms.push(REPORT.findOne({reporter: req.user._id, obj: req.params.quesId, type: "phoneQuestion"}));

    Promise.all(proms)
    .then((results)=>{
        let ques = results[0];
        let rep = results[1];

        if(!ques){
            return res.status(404).json({
                success: false,
                status: "not found or you own it"
            });
        }

        if(rep){
            return res.status(403).json({
                success: false,
                status: "already reported"
            });
        }

        // create the report document
        REPORT.create({
            reporter: req.user._id,
            reportee: ques.user,
            type: "phoneQuestion",
            reason: reason,
            info: req.body.info,
            obj: req.params.quesId,
            onModelObj: "pQues"
        })
        .then((r)=>{
            return res.status(200).json({
                success: true
            });
        })
        .catch((err)=>{
            console.log("Error from /reports/question/phone/:quesId: ", err);
            return res.status(500).json({
                success: false,
                status: "error creating the report"
            });
        });
    })
    .catch((err)=>{
        console.log("Error from /reports/question/phone/:quesId: ", err);
        return res.status(500).json({
            success: false,
            status: "error finding the question or the report"
        });
    });
});



// report a company question
reportRouter.post("/question/company/:quesId", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
    
    const reason = req.body.reason;

    if(!reason){
        return res.status(400).json({
            success: false,
            status: "bad request"
        });
    }

    if(typeof reason !== "number"){
        return res.status(400).json({
            success: false,
            status: "bad request"
        });
    }

    if(!(reason == 1 || reason == 2 || reason == 3 || reason == 4 || reason == 5 || reason == 6)){
        return res.status(400).json({
            success: false,
            status: "bad request"
        });
    }

    if(req.body.info){
        if(typeof req.body.info !== "string"){
            return res.status(400).json({
                success: false,
                status: "bad request"
            });
        }
    }

    // let stringReason = "";
    // switch(reason){
    //     case 1: stringReason = "disturbance"; break;
    //     case 2: stringReason = "violence"; break;
    //     case 3: stringReason = "harassment"; break;
    //     case 4: stringReason = "hate"; break;
    //     case 5: stringReason = "porn"; break;
    //     case 6: stringReason = "other"; break;
    // }


    if(req.user.blockedFromReviews){
        return res.status(403).json({
            success: false,
            status: "blocked"
        });
    }
    
    let proms = [];
    proms.push(CQUES.findOne({_id: req.params.quesId, user: {$ne: req.user._id}}, {user: 1}));
    proms.push(REPORT.findOne({reporter: req.user._id, obj: req.params.quesId, type: "companyQuestion"}));

    Promise.all(proms)
    .then((results)=>{
        let ques = results[0];
        let rep = results[1];

        if(!ques){
            return res.status(404).json({
                success: false,
                status: "not found or you own it"
            });
        }

        if(rep){
            return res.status(403).json({
                success: false,
                status: "already reported"
            });
        }

        // create the report document
        REPORT.create({
            reporter: req.user._id,
            reportee: ques.user,
            type: "companyQuestion",
            reason: reason,
            info: req.body.info,
            obj: req.params.quesId,
            onModelObj: "cQues"
        })
        .then((r)=>{
            return res.status(200).json({
                success: true
            });
        })
        .catch((err)=>{
            console.log("Error from /reports/question/company/:quesId: ", err);
            return res.status(500).json({
                success: false,
                status: "error creating the report"
            });
        });
    })
    .catch((err)=>{
        console.log("Error from /reports/question/company/:quesId: ", err);
        return res.status(500).json({
            success: false,
            status: "error finding the question or the report"
        });
    });
});






module.exports = reportRouter;