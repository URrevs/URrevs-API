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



const config = require("../config");

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
    proms.push(PHONEREV.findOne({_id: req.params.revId, user: {$ne: req.user._id}, hidden: false}, {user: 1}));
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
    proms.push(COMPANYREV.findOne({_id: req.params.revId, user: {$ne: req.user._id}, hidden: false}, {user: 1}));
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


    if(req.user.blockedFromQuestions){
        return res.status(403).json({
            success: false,
            status: "blocked"
        });
    }
    
    let proms = [];
    proms.push(PQUES.findOne({_id: req.params.quesId, user: {$ne: req.user._id}, hidden: false}, {user: 1}));
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


    if(req.user.blockedFromQuestions){
        return res.status(403).json({
            success: false,
            status: "blocked"
        });
    }
    
    let proms = [];
    proms.push(CQUES.findOne({_id: req.params.quesId, user: {$ne: req.user._id}, hidden: false}, {user: 1}));
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




// report a phone review comment
reportRouter.post("/review/phone/:revId/comments/:commentId", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
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


    if(req.user.blockedFromComment){
        return res.status(403).json({
            success: false,
            status: "blocked"
        });
    }


    let proms = [];

    proms.push(PHONEREV.findOne({_id: req.params.revId, hidden: false}));
    proms.push(PHONE_REVS_COMMENTS.findOne({_id: req.params.commentId, review: req.params.revId, user: {$ne: req.user._id}, hidden: false}, {user: 1}));
    proms.push(REPORT.findOne({reporter: req.user._id, obj: req.params.commentId, type: "phoneComment"}));

    Promise.all(proms)
    .then((results)=>{
        let rev = results[0];
        let comment = results[1];
        let rep = results[2];

        if(!rev){
            return res.status(404).json({
                success: false,
                status: "parent not found"
            });
        }

        if(!comment){
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
            // create the report document
            REPORT.create({
                reporter: req.user._id,
                reportee: comment.user,
                type: "phoneComment",
                reason: reason,
                info: req.body.info,
                obj: req.params.commentId,
                onModelObj: "pRevsComment",
                parObj: req.params.revId,
                onModelParObj: "pRev"
            })
            .then((r)=>{
                return res.status(200).json({
                    success: true
                });
            })
            .catch((err)=>{
                console.log("Error from /reports/review/phone/:revId/comments/:commentId: ", err);
                return res.status(500).json({
                    success: false,
                    status: "error creating the report"
                });
            });
    })
    .catch((err)=>{
        console.log("Error from /reports/review/phone/:revId/comments/:commentId: ", err);
        return res.status(500).json({
            success: false,
            status: "error finding the review or the comment or the report"
        });
    });
});





// report a company review comment
reportRouter.post("/review/company/:revId/comments/:commentId", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
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


    if(req.user.blockedFromComment){
        return res.status(403).json({
            success: false,
            status: "blocked"
        });
    }


    let proms = [];

    proms.push(COMPANYREV.findOne({_id: req.params.revId, hidden: false}));
    proms.push(COMPANY_REVS_COMMENTS.findOne({_id: req.params.commentId, review: req.params.revId, user: {$ne: req.user._id}, hidden: false}, {user: 1}));
    proms.push(REPORT.findOne({reporter: req.user._id, obj: req.params.commentId, type: "companyComment"}));

    Promise.all(proms)
    .then((results)=>{
        let rev = results[0];
        let comment = results[1];
        let rep = results[2];

        if(!rev){
            return res.status(404).json({
                success: false,
                status: "parent not found"
            });
        }

        if(!comment){
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
            // create the report document
            REPORT.create({
                reporter: req.user._id,
                reportee: comment.user,
                type: "companyComment",
                reason: reason,
                info: req.body.info,
                obj: req.params.commentId,
                onModelObj: "cRevsComment",
                parObj: req.params.revId,
                onModelParObj: "cRev"
            })
            .then((r)=>{
                return res.status(200).json({
                    success: true
                });
            })
            .catch((err)=>{
                console.log("Error from /reports/review/company/:revId/comments/:commentId: ", err);
                return res.status(500).json({
                    success: false,
                    status: "error creating the report"
                });
            });
    })
    .catch((err)=>{
        console.log("Error from /reports/review/company/:revId/comments/:commentId: ", err);
        return res.status(500).json({
            success: false,
            status: "error finding the review or the comment or the report"
        });
    });
});





// report a phone question answer
reportRouter.post("/question/phone/:quesId/answers/:ansId", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
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


    if(req.user.blockedFromAnswer){
        return res.status(403).json({
            success: false,
            status: "blocked"
        });
    }


    let proms = [];

    proms.push(PQUES.findOne({_id: req.params.quesId, hidden: false}));
    proms.push(PANS.findOne({_id: req.params.ansId, user: {$ne: req.user._id}, question: req.params.quesId, hidden: false}, {user: 1}));
    proms.push(REPORT.findOne({reporter: req.user._id, obj: req.params.ansId, type: "phoneAnswer"}));

    Promise.all(proms)
    .then((results)=>{
        let ques = results[0];
        let answer = results[1];
        let rep = results[2];

        if(!ques){
            return res.status(404).json({
                success: false,
                status: "parent not found"
            });
        }

        if(!answer){
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
            // create the report document
            REPORT.create({
                reporter: req.user._id,
                reportee: answer.user,
                type: "phoneAnswer",
                reason: reason,
                info: req.body.info,
                obj: req.params.ansId,
                onModelObj: "pQuesAnswer",
                parObj: req.params.quesId,
                onModelParObj: "pQues"
            })
            .then((r)=>{
                return res.status(200).json({
                    success: true
                });
            })
            .catch((err)=>{
                console.log("Error from /reports/question/company/:quesId/answers/:ansId: ", err);
                return res.status(500).json({
                    success: false,
                    status: "error creating the report"
                });
            });
    })
    .catch((err)=>{
        console.log("Error from /reports/question/company/:quesId/answers/:ansId: ", err);
        return res.status(500).json({
            success: false,
            status: "error finding the question or the answer or the report"
        });
    });
});





// report a company question answer
reportRouter.post("/question/company/:quesId/answers/:ansId", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
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


    if(req.user.blockedFromAnswer){
        return res.status(403).json({
            success: false,
            status: "blocked"
        });
    }


    let proms = [];

    proms.push(CQUES.findOne({_id: req.params.quesId, hidden: false}));
    proms.push(CANS.findOne({_id: req.params.ansId, user: {$ne: req.user._id}, question: req.params.quesId, hidden: false}, {user: 1}));
    proms.push(REPORT.findOne({reporter: req.user._id, obj: req.params.ansId, type: "companyAnswer"}));

    Promise.all(proms)
    .then((results)=>{
        let ques = results[0];
        let answer = results[1];
        let rep = results[2];

        if(!ques){
            return res.status(404).json({
                success: false,
                status: "parent not found"
            });
        }

        if(!answer){
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
            // create the report document
            REPORT.create({
                reporter: req.user._id,
                reportee: answer.user,
                type: "companyAnswer",
                reason: reason,
                info: req.body.info,
                obj: req.params.ansId,
                onModelObj: "cQuesAnswer",
                parObj: req.params.quesId,
                onModelParObj: "cQues"
            })
            .then((r)=>{
                return res.status(200).json({
                    success: true
                });
            })
            .catch((err)=>{
                console.log("Error from /reports/question/company/:quesId/answers/:ansId: ", err);
                return res.status(500).json({
                    success: false,
                    status: "error creating the report"
                });
            });
    })
    .catch((err)=>{
        console.log("Error from /reports/question/company/:quesId/answers/:ansId: ", err);
        return res.status(500).json({
            success: false,
            status: "error finding the question or the answer or the report"
        });
    });
});






// report a phone review comment reply
reportRouter.post("/review/phone/:revId/comments/:commentId/replies/:replyId", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
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


    if(req.user.blockedFromReplyComment){
        return res.status(403).json({
            success: false,
            status: "blocked"
        });
    }


    let proms = [];
    proms.push(PHONEREV.findOne({_id: req.params.revId, hidden: false}));
    proms.push(PHONE_REVS_COMMENTS.findOne({_id: req.params.commentId, review: req.params.revId, "replies._id": req.params.replyId, hidden: false}));
    proms.push(REPORT.findOne({reporter: req.user._id, obj: req.params.replyId, type: "phoneCommentReply"}));

    Promise.all(proms)
    .then((results)=>{
        let rev = results[0];
        let comment = results[1];
        let rep = results[2];

        if(!rev){
            return res.status(404).json({
                success: false,
                status: "parent not found"
            });
        }

        if(!comment){
            return res.status(404).json({
                success: false,
                status: "parent not found"
            });
        }

        if(rep){
            return res.status(403).json({
                success: false,
                status: "already reported"
            });
        }

        let reply = comment.replies.id(req.params.replyId);

        if(reply.user.equals(req.user._id)){
            return res.status(403).json({
                success: false,
                status: "you own it"
            });
        }

        if(reply.hidden){
            return res.status(404).json({
                success: false,
                status: "not found"
            });
        }

        // create the report document
        REPORT.create({
            reporter: req.user._id,
            reportee: reply.user,
            type: "phoneCommentReply",
            reason: reason,
            info: req.body.info,
            obj: req.params.replyId,
            onModelObj: "pRevsComment.replies",
            parObj: req.params.commentId,
            onModelParObj: "pRevsComment",
            par2Obj: req.params.revId,
            onModelPar2Obj: "pRev"
        })
        .then((r)=>{
            return res.status(200).json({
                success: true
            });
        })
        .catch((err)=>{
            console.log("Error from /reports/review/phone/:revId/comments/:commentId/replies/:replyId: ", err);
            return res.status(500).json({
                success: false,
                status: "error creating the report"
            });
        });
    })
    .catch((err)=>{
        console.log("Error from /reports/review/phone/:revId/comments/:commentId/replies/:replyId: ", err);
        return res.status(500).json({
            success: false,
            status: "error finding the review or the comment or the reply ot the report"
        });
    });
});






// report a company review comment reply
reportRouter.post("/review/company/:revId/comments/:commentId/replies/:replyId", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
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


    if(req.user.blockedFromReplyComment){
        return res.status(403).json({
            success: false,
            status: "blocked"
        });
    }


    let proms = [];
    proms.push(COMPANYREV.findOne({_id: req.params.revId, hidden: false}));
    proms.push(COMPANY_REVS_COMMENTS.findOne({_id: req.params.commentId, review: req.params.revId, "replies._id": req.params.replyId, hidden: false}));
    proms.push(REPORT.findOne({reporter: req.user._id, obj: req.params.replyId, type: "companyCommentReply"}));

    Promise.all(proms)
    .then((results)=>{
        let rev = results[0];
        let comment = results[1];
        let rep = results[2];

        if(!rev){
            return res.status(404).json({
                success: false,
                status: "parent not found"
            });
        }

        if(!comment){
            return res.status(404).json({
                success: false,
                status: "parent not found"
            });
        }

        if(rep){
            return res.status(403).json({
                success: false,
                status: "already reported"
            });
        }

        let reply = comment.replies.id(req.params.replyId);

        if(reply.user.equals(req.user._id)){
            return res.status(403).json({
                success: false,
                status: "you own it"
            });
        }

        if(reply.hidden){
            return res.status(404).json({
                success: false,
                status: "not found"
            });
        }

        // create the report document
        REPORT.create({
            reporter: req.user._id,
            reportee: reply.user,
            type: "companyCommentReply",
            reason: reason,
            info: req.body.info,
            obj: req.params.replyId,
            onModelObj: "cRevsComment.replies",
            parObj: req.params.commentId,
            onModelParObj: "cRevsComment",
            par2Obj: req.params.revId,
            onModelPar2Obj: "cRev"
        })
        .then((r)=>{
            return res.status(200).json({
                success: true
            });
        })
        .catch((err)=>{
            console.log("Error from /reports/review/company/:revId/comments/:commentId/replies/:replyId: ", err);
            return res.status(500).json({
                success: false,
                status: "error creating the report"
            });
        });
    })
    .catch((err)=>{
        console.log("Error from /reports/review/company/:revId/comments/:commentId/replies/:replyId: ", err);
        return res.status(500).json({
            success: false,
            status: "error finding the review or the comment or the reply ot the report"
        });
    });
});





// report a phone question answer reply
reportRouter.post("/question/phone/:quesId/answers/:ansId/replies/:replyId", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
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


    if(req.user.blockedFromReplyAnswer){
        return res.status(403).json({
            success: false,
            status: "blocked"
        });
    }


    let proms = [];
    proms.push(PQUES.findOne({_id: req.params.quesId, hidden: false}));
    proms.push(PANS.findOne({_id: req.params.ansId, question: req.params.quesId, "replies._id": req.params.replyId, hidden: false}));
    proms.push(REPORT.findOne({reporter: req.user._id, obj: req.params.replyId, type: "phoneAnswerReply"}));

    Promise.all(proms)
    .then((results)=>{
        let ques = results[0];
        let answer = results[1];
        let rep = results[2];

        if(!ques){
            return res.status(404).json({
                success: false,
                status: "parent not found"
            });
        }

        if(!answer){
            return res.status(404).json({
                success: false,
                status: "parent not found"
            });
        }

        if(rep){
            return res.status(403).json({
                success: false,
                status: "already reported"
            });
        }

        let reply = answer.replies.id(req.params.replyId);

        if(reply.user.equals(req.user._id)){
            return res.status(403).json({
                success: false,
                status: "you own it"
            });
        }

        if(reply.hidden){
            return res.status(404).json({
                success: false,
                status: "not found"
            });
        }

        // create the report document
        REPORT.create({
            reporter: req.user._id,
            reportee: reply.user,
            type: "phoneAnswerReply",
            reason: reason,
            info: req.body.info,
            obj: req.params.replyId,
            onModelObj: "pQuesAnswer.replies",
            parObj: req.params.ansId,
            onModelParObj: "pQuesAnswer",
            par2Obj: req.params.quesId,
            onModelPar2Obj: "pQues"
        })
        .then((r)=>{
            return res.status(200).json({
                success: true
            });
        })
        .catch((err)=>{
            console.log("Error from /reports/question/phone/:quesId/answers/:ansId/replies/:replyId: ", err);
            return res.status(500).json({
                success: false,
                status: "error creating the report"
            });
        });
    })
    .catch((err)=>{
        console.log("Error from /reports/question/phone/:quesId/answers/:ansId/replies/:replyId: ", err);
        return res.status(500).json({
            success: false,
            status: "error finding the review or the comment or the reply ot the report"
        });
    });
});





// report a company question answer reply
reportRouter.post("/question/company/:quesId/answers/:ansId/replies/:replyId", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
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


    if(req.user.blockedFromReplyAnswer){
        return res.status(403).json({
            success: false,
            status: "blocked"
        });
    }


    let proms = [];
    proms.push(CQUES.findOne({_id: req.params.quesId, hidden: false}));
    proms.push(CANS.findOne({_id: req.params.ansId, question: req.params.quesId, "replies._id": req.params.replyId, hidden: false}));
    proms.push(REPORT.findOne({reporter: req.user._id, obj: req.params.replyId, type: "companyAnswerReply"}));

    Promise.all(proms)
    .then((results)=>{
        let ques = results[0];
        let answer = results[1];
        let rep = results[2];

        if(!ques){
            return res.status(404).json({
                success: false,
                status: "parent not found"
            });
        }

        if(!answer){
            return res.status(404).json({
                success: false,
                status: "parent not found"
            });
        }

        if(rep){
            return res.status(403).json({
                success: false,
                status: "already reported"
            });
        }

        let reply = answer.replies.id(req.params.replyId);

        if(reply.user.equals(req.user._id)){
            return res.status(403).json({
                success: false,
                status: "you own it"
            });
        }

        if(reply.hidden){
            return res.status(404).json({
                success: false,
                status: "not found"
            });
        }

        // create the report document
        REPORT.create({
            reporter: req.user._id,
            reportee: reply.user,
            type: "companyAnswerReply",
            reason: reason,
            info: req.body.info,
            obj: req.params.replyId,
            onModelObj: "cQuesAnswer.replies",
            parObj: req.params.ansId,
            onModelParObj: "cQuesAnswer",
            par2Obj: req.params.quesId,
            onModelPar2Obj: "cQues"
        })
        .then((r)=>{
            return res.status(200).json({
                success: true
            });
        })
        .catch((err)=>{
            console.log("Error from /reports/question/company/:quesId/answers/:ansId/replies/:replyId: ", err);
            return res.status(500).json({
                success: false,
                status: "error creating the report"
            });
        });
    })
    .catch((err)=>{
        console.log("Error from /reports/question/company/:quesId/answers/:ansId/replies/:replyId: ", err);
        return res.status(500).json({
            success: false,
            status: "error finding the review or the comment or the reply ot the report"
        });
    });
});



// ----------------------------------------------------------------------------------------------------


// get all opened reports
reportRouter.get("/open", cors.cors, rateLimit, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next)=>{
    let itemsPerRound = parseInt((process.env.REPORTS_PER_ROUND|| config.REPORTS_PER_ROUND));
    let roundNum = req.query.round;
    if(!roundNum || isNaN(roundNum)){
        return res.status(400).json({
            success: false,
            status: "bad request",
        });
    }
    REPORT.find({closed: false})
    .sort({createdAt: -1})
    .skip((roundNum - 1) * itemsPerRound)
    .limit(itemsPerRound)
    .populate("reporter", {name: 1, picture: 1}).populate("reportee", {name: 1})
    .then((reports)=>{
        let result = [];

        for(let rep of reports){
            result.push({
                _id: rep._id,
                createdAt: rep.createdAt,
                reason: rep.reason,
                info: rep.info,
                reporterId: rep.reporter._id,
                reporteeId: rep.reportee._id,
                reporterName: rep.reporter.name,
                reporteeName: rep.reportee.name,
                reporterPicture: rep.reporter.picture,
                reporteeBlocked: rep.blockUser,
                contentHidden: rep.hideContent
            })
        }

        return res.status(200).json({
            success: true,
            reports: result
        });
    })
    .catch((err)=>{
        console.log("Error from /reports/open: ", err);
        return res.status(500).json({
            success: false,
            status: "error finding the reports"
        });
    });
});





// get all closed reports
reportRouter.get("/closed", cors.cors, rateLimit, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next)=>{
    let itemsPerRound = parseInt((process.env.REPORTS_PER_ROUND|| config.REPORTS_PER_ROUND));
    let roundNum = req.query.round;
    if(!roundNum || isNaN(roundNum)){
        return res.status(400).json({
            success: false,
            status: "bad request",
        });
    }
    REPORT.find({closed: true})
    .sort({createdAt: -1})
    .skip((roundNum - 1) * itemsPerRound)
    .limit(itemsPerRound)
    .populate("reporter", {name: 1, picture: 1}).populate("reportee", {name: 1})
    .then((reports)=>{
        let result = [];

        for(let rep of reports){
            result.push({
                _id: rep._id,
                createdAt: rep.createdAt,
                reason: rep.reason,
                info: rep.info,
                reporterId: rep.reporter._id,
                reporteeId: rep.reportee._id,
                reporterName: rep.reporter.name,
                reporteeName: rep.reportee.name,
                reporterPicture: rep.reporter.picture,
                reporteeBlocked: rep.blockUser,
                contentHidden: rep.hideContent
            })
        }

        return res.status(200).json({
            success: true,
            reports: result
        });
    })
    .catch((err)=>{
        console.log("Error from /reports/closed: ", err);
        return res.status(500).json({
            success: false,
            status: "error finding the reports"
        });
    });
});




// close a report
reportRouter.put("/:repId/close", cors.cors, rateLimit, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next)=>{
    REPORT.findByIdAndUpdate(req.params.repId, {closed: true})
    .then((r)=>{
        if(!r){
            return res.status(404).json({
                success: false,
                status: "not found"
            });
        }

        return res.status(200).json({
            success: true
        });
    })
    .catch((err)=>{
        console.log("Error from /reports/:repId/close: ", err);
        return res.status(500).json({
            success: false,
            status: "error closing the report"
        });
    });
});


module.exports = reportRouter;