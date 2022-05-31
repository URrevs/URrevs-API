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
const PANS = require("../models/phoneAnswer");
const CANS = require("../models/companyAnswer");
const PHONE_REVS_LIKES = require("../models/phoneRevsLikes");
const COMPANY_REVS_LIKES = require("../models/companyRevsLikes");
const PHONE_QUES_LIKES = require("../models/phoneQuesLike");
const PQUES_ANSWERS_LIKES = require("../models/phoneQuesAnswersLikes");
const PQUES_REPLIES_LIKES = require("../models/phoneQuestionRepliesLike");
const COMPANY_QUES_LIKES = require("../models/companyQuesLike");
const CQUES_ANSWERS_LIKES = require("../models/companyQuesAnsLikes");
const CQUES_REPLIES_LIKES = require("../models/companyQuestionRepliesLike");


const config = require("../config");


// preflight
homeRouter.options("*", cors.cors, (req, res, next) => {
    res.sendStatus(200);
});




// get recommended reviews and questions
homeRouter.get("/recommended", cors.cors, rateLimit, authenticate.verifyFlexible, async(req, res, next) => {
    let roundNum = req.query.round;

    if(roundNum == null || isNaN(roundNum)){
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.json({success: false, status: "bad request"});
        return;
    }

    let resultPrevs = [];
    let resultCrevs = [];
    let resultPques = [];
    let resultCques = [];

    if(req.user){
        // get recommendations for authenticated user
        try{
            let TIMEOUT = process.env.TIMEOUT || config.TIMEOUT;

            const {data: resp} = await axios.get(process.env.AI_LINK + "/all/" + req.user._id + "/recommend",
            {headers: {'X-Api-Key': process.env.AI_API_KEY}, params: {"round": roundNum}},
            {timeout: TIMEOUT, httpsAgent: new https.Agent({ keepAlive: true })});

            let pRevs = resp.phoneRevs;
            let cRevs = resp.companyRevs;
            let pQues = resp.phoneQuestions;
            let cQues = resp.companyQuestions;
            let totalIds = resp.total;
            
            let proms = [];
            proms.push(PREVS.find({_id: {$in: pRevs}}).populate("phone", {name: 1}).populate("user", {name: 1, picture: 1}));
            proms.push(CREVS.find({_id: {$in: cRevs}}).populate("company", {name: 1}).populate("user", {name: 1, picture: 1}));
            proms.push(PQUES.find({_id: {$in: pQues}}).populate("phone", {name: 1}).populate("user", {name: 1, picture: 1}));
            proms.push(CQUES.find({_id: {$in: cQues}}).populate("company", {name: 1}).populate("user", {name: 1, picture: 1}));

            Promise.all(proms)
            .then(async([pRevs, cRevs, pQues, cQues]) => {
                
                let pRevsIdsList = [];
                let pRevsIds = {};

                let cRevsIdsList = [];
                let cRevsIds = {};

                let pQuesIds = [];
                let pQuesObj = {};
                let pAcceptedAnsIds = [];
                let pAcceptedAnsObj = {};
                let pRepliesIds = [];
                let pRepliesObj = {};

                let cQuesIds = [];
                let cQuesObj = {};
                let cAcceptedAnsIds = [];
                let cAcceptedAnsObj = {};
                let cRepliesIds = [];
                let cRepliesObj = {};

                for(let [index, rev] of pRevs.entries()){

                    pRevsIdsList.push(rev._id);
                    pRevsIds[rev._id] = index;

                    resultPrevs.push({
                        _id: rev._id,
                        type: "phone",
                        targetId: rev.phone._id,
                        targetName: rev.phone.name,
                        userId: rev.user._id,
                        userName: rev.user.name,
                        picture: rev.user.picture,
                        createdAt: rev.createdAt,
                        views: rev.views,
                        likes: rev.likes,
                        commentsCount: rev.commentsCount,
                        shares: rev.shares,
                        ownedAt: rev.ownedDate,
                        generalRating: rev.generalRating,
                        uiRating: rev.uiRating,
                        manufacturingQuality: rev.manQuality,
                        valueForMoney: rev.valFMon,
                        camera: rev.camera,
                        callQuality: rev.callQuality,
                        battery: rev.batteryRating,
                        pros: rev.pros,
                        cons: rev.cons,
                        liked: false
                    });
                }


                for(let [index, rev] of cRevs.entries()){

                    cRevsIdsList.push(rev._id);
                    cRevsIds[rev._id] = index;

                    resultCrevs.push({
                        _id: rev._id,
                        type: "company",
                        targetId: rev.company._id,
                        targetName: rev.company.name,
                        userId: rev.user._id._id,
                        userName: rev.user.name,
                        picture: rev.user.picture,
                        createdAt: rev.createdAt,
                        views: rev.views,
                        likes: rev.likes,
                        commentsCount: rev.commentsCount,
                        shares: rev.shares,
                        corresPhoneRev: rev.corresPrev,
                        generalRating: rev.generalRating,
                        pros: rev.pros,
                        cons: rev.cons,
                        liked: false
                    });
                }


                for(let [index, ques] of pQues.entries()){
                    pQuesIds.push(ques._id);
                    pQuesObj[ques._id] = index;
              
                    let resultAns = null;
                    if(ques.acceptedAns){
                        pAcceptedAnsIds.push(ques.acceptedAns);
                        pAcceptedAnsObj[ques.acceptedAns] = index;
                      try{
                        let ans = await PANS.findOne({_id: ques.acceptedAns}).populate("user", {name: 1, picture: 1}).populate("replies.user", {name: 1, picture: 1});
                        let repliesList = [];
              
                        if(ans.replies.length > 0){
                          for(let i=0; i<ans.replies.length; i++){
                            let reply = ans.replies[i];
              
                            pRepliesIds.push(reply._id);
                            pRepliesObj[reply._id] = {answer: index, reply: i};
                            
                            repliesList.push({
                              _id: reply._id,
                              userId: reply.user._id,
                              userName: reply.user.name,
                              userPicture: reply.user.picture,
                              content: reply.content,
                              likes: reply.likes,
                              liked: false,
                              createdAt: reply.createdAt
                            });
                          }
                        }
              
                        resultAns = {
                          _id: ans._id,
                          userId: ans.user._id,
                          userName: ans.user.name,
                          picture: ans.user.picture,
                          content: ans.content,
                          upvotes: ans.likes,
                          createdAt: ans.createdAt,
                          ownedAt: ans.ownedAt,
                          upvoted: false,
                          replies: repliesList
                        }
              
                      }
                      catch(err){
                        console.log("Error from GET /questions/phone/by/:userId: ", err);
                        return res.status(500).json({
                          success: false,
                          status: "internal server error",
                          err: "finding the acceptedAnswer failed"
                        });
                      }
                    }
              
                    resultPques.push({
                      _id: ques._id,
                      type: "phone",
                      userId: ques.user._id,
                      userName: ques.user.name,
                      picture: ques.user.picture,
                      createdAt: ques.createdAt,
                      targetId: ques.phone._id,
                      targetName: ques.phone.name,
                      content: ques.content,
                      upvotes: ques.upvotes,
                      ansCount: ques.ansCount,
                      shares: ques.shares,
                      upvoted: false,
                      acceptedAns: resultAns
                    });
                }


                for(let [index, ques] of cQues.entries()){
                    cQuesIds.push(ques._id);
                    cQuesObj[ques._id] = index;
              
                    let resultAns = null;
                    if(ques.acceptedAns){
                        cAcceptedAnsIds.push(ques.acceptedAns);
                        cAcceptedAnsObj[ques.acceptedAns] = index;
                      try{
                        let ans = await CANS.findOne({_id: ques.acceptedAns}).populate("user", {name: 1, picture: 1}).populate("replies.user", {name: 1, picture: 1});
                        let repliesList = [];
              
                        if(ans.replies.length > 0){
                          for(let i=0; i<ans.replies.length; i++){
                            let reply = ans.replies[i];
              
                            cRepliesIds.push(reply._id);
                            cRepliesObj[reply._id] = {answer: index, reply: i};
                            
                            repliesList.push({
                              _id: reply._id,
                              userId: reply.user._id,
                              userName: reply.user.name,
                              userPicture: reply.user.picture,
                              content: reply.content,
                              likes: reply.likes,
                              liked: false,
                              createdAt: reply.createdAt
                            });
                          }
                        }
              
                        resultAns = {
                          _id: ans._id,
                          userId: ans.user._id,
                          userName: ans.user.name,
                          picture: ans.user.picture,
                          content: ans.content,
                          upvotes: ans.likes,
                          createdAt: ans.createdAt,
                          ownedAt: ans.ownedAt,
                          upvoted: false,
                          replies: repliesList
                        }
              
                      }
                      catch(err){
                        console.log("Error from GET /questions/company/by/:userId: ", err);
                        return res.status(500).json({
                          success: false,
                          status: "internal server error",
                          err: "finding the acceptedAnswer failed"
                        });
                      }
                    }
              
                    resultCques.push({
                      _id: ques._id,
                      type: "company",
                      userId: ques.user._id,
                      userName: ques.user.name,
                      picture: ques.user.picture,
                      createdAt: ques.createdAt,
                      targetId: ques.company._id,
                      targetName: ques.company.name,
                      content: ques.content,
                      upvotes: ques.upvotes,
                      ansCount: ques.ansCount,
                      shares: ques.shares,
                      upvoted: false,
                      acceptedAns: resultAns
                    });
                }


                // checkig liked state
                let proms1 = [];
                proms1.push(PHONE_REVS_LIKES.find({user: req.user._id, review: {$in: pRevsIdsList}, unliked: false}));
                proms1.push(COMPANY_REVS_LIKES.find({user: req.user._id, review: {$in: cRevsIdsList}, unliked: false}));
                proms1.push(PHONE_QUES_LIKES.find({user: req.user._id, question: {$in: pQuesIds}, unliked: false}));
                proms1.push(PQUES_ANSWERS_LIKES.find({user: req.user._id, answer: {$in: pAcceptedAnsIds}}));
                proms1.push(PQUES_REPLIES_LIKES.find({user: req.user._id, reply: {$in: pRepliesIds}}));
                proms1.push(COMPANY_QUES_LIKES.find({user: req.user._id, question: {$in: cQuesIds}, unliked: false}));
                proms1.push(CQUES_ANSWERS_LIKES.find({user: req.user._id, answer: {$in: cAcceptedAnsIds}}));
                proms1.push(CQUES_REPLIES_LIKES.find({user: req.user._id, reply: {$in: cRepliesIds}}));

                try{
                    let allLikes = await Promise.all(proms1);
                    let pRevsLikes = allLikes[0];
                    let cRevsLikes = allLikes[1];
                    let pQuesLikes = allLikes[2];
                    let pAnsLikes = allLikes[3];
                    let pRepliesLikes = allLikes[4];
                    let cQuesLikes = allLikes[5];
                    let cAnsLikes = allLikes[6];
                    let cRepliesLikes = allLikes[7];
                    
                    // checking liked state for phone reviews
                    for(let like of pRevsLikes){
                        resultPrevs[pRevsIds[like.review]].liked = true;
                    }


                    // checking liked state for company reviews
                    for(let like of cRevsLikes){
                        resultCrevs[cRevsIds[like.review]].liked = true;
                    }


                    // checking liked state for phone questions
                    for(let like of pQuesLikes){
                        let id = like.question;
                        resultPques[pQuesObj[id]].upvoted = true;
                    }
                
                    for(let like of pAnsLikes){
                        let id = like.answer;
                        resultPques[pAcceptedAnsObj[id]].acceptedAns.upvoted = true;
                    }
                
                    for(let like of pRepliesLikes){
                        let id = like.reply;
                        resultPques[pRepliesObj[id].answer].acceptedAns.replies[pRepliesObj[id].reply].liked = true;
                    }


                    // checking liked state for company questions
                    for(let like of cQuesLikes){
                        let id = like.question;
                        resultCques[cQuesObj[id]].upvoted = true;
                    }
                
                    for(let like of cAnsLikes){
                        let id = like.answer;
                        resultCques[cAcceptedAnsObj[id]].acceptedAns.upvoted = true;
                    }
                
                    for(let like of cRepliesLikes){
                        let id = like.reply;
                        resultCques[cRepliesObj[id].answer].acceptedAns.replies[cRepliesObj[id].reply].liked = true;
                    }

                    console.log("-----------------AI Recommendation Success-----------------");
                    return res.status(200).json({
                        success: true,
                        phoneRevs: resultPrevs,
                        companyRevs: resultCrevs,
                        phoneQuestions: resultPques,
                        companyQuestions: resultCques,
                        total: totalIds
                    });

                }
                catch(err){
                    console.log("Error from /home/recommended: ", err);
                    return res.status(500).json({
                        success: false,
                        status: "internal server error",
                        err: "finding likes failed"
                    });
                }
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
            console.log("-----------------AI Recommendation Failed-----------------", err.response.status, err.response.data);
            // Apply backup routine
            let itemsPerRound = parseInt((process.env.HOME_SCREEN|| config.HOME_SCREEN));
            
            let proms = [];
            proms.push(PREVS.find({}).sort({likes: -1, commentsCount: -1}).skip((roundNum - 1) * itemsPerRound).limit(itemsPerRound).populate("phone", {name: 1}).populate("user", {name: 1, picture: 1}));
            proms.push(CREVS.find({}).sort({likes: -1, commentsCount: -1}).skip((roundNum - 1) * itemsPerRound).limit(itemsPerRound).populate("company", {name: 1}).populate("user", {name: 1, picture: 1}));
            proms.push(PQUES.find({}).sort({upvotes: -1, ansCount: -1}).skip((roundNum - 1) * itemsPerRound).limit(itemsPerRound).populate("phone", {name: 1}).populate("user", {name: 1, picture: 1}));
            proms.push(CQUES.find({}).sort({upvotes: -1, ansCount: -1}).skip((roundNum - 1) * itemsPerRound).limit(itemsPerRound).populate("company", {name: 1}).populate("user", {name: 1, picture: 1}));
          
            Promise.all(proms)
            .then(async([pRevs, cRevs, pQues, cQues]) => {
                
                let pRevsIdsList = [];
                let pRevsIds = {};

                let cRevsIdsList = [];
                let cRevsIds = {};

                let pQuesIds = [];
                let pQuesObj = {};
                let pAcceptedAnsIds = [];
                let pAcceptedAnsObj = {};
                let pRepliesIds = [];
                let pRepliesObj = {};

                let cQuesIds = [];
                let cQuesObj = {};
                let cAcceptedAnsIds = [];
                let cAcceptedAnsObj = {};
                let cRepliesIds = [];
                let cRepliesObj = {};

                for(let [index, rev] of pRevs.entries()){

                    pRevsIdsList.push(rev._id);
                    pRevsIds[rev._id] = index;

                    resultPrevs.push({
                        _id: rev._id,
                        type: "phone",
                        targetId: rev.phone._id,
                        targetName: rev.phone.name,
                        userId: rev.user._id,
                        userName: rev.user.name,
                        picture: rev.user.picture,
                        createdAt: rev.createdAt,
                        views: rev.views,
                        likes: rev.likes,
                        commentsCount: rev.commentsCount,
                        shares: rev.shares,
                        ownedAt: rev.ownedDate,
                        generalRating: rev.generalRating,
                        uiRating: rev.uiRating,
                        manufacturingQuality: rev.manQuality,
                        valueForMoney: rev.valFMon,
                        camera: rev.camera,
                        callQuality: rev.callQuality,
                        battery: rev.batteryRating,
                        pros: rev.pros,
                        cons: rev.cons,
                        liked: false
                    });
                }


                for(let [index, rev] of cRevs.entries()){

                    cRevsIdsList.push(rev._id);
                    cRevsIds[rev._id] = index;

                    resultCrevs.push({
                        _id: rev._id,
                        type: "company",
                        targetId: rev.company._id,
                        targetName: rev.company.name,
                        userId: rev.user._id._id,
                        userName: rev.user.name,
                        picture: rev.user.picture,
                        createdAt: rev.createdAt,
                        views: rev.views,
                        likes: rev.likes,
                        commentsCount: rev.commentsCount,
                        shares: rev.shares,
                        corresPhoneRev: rev.corresPrev,
                        generalRating: rev.generalRating,
                        pros: rev.pros,
                        cons: rev.cons,
                        liked: false
                    });
                }


                for(let [index, ques] of pQues.entries()){
                    pQuesIds.push(ques._id);
                    pQuesObj[ques._id] = index;
              
                    let resultAns = null;
                    if(ques.acceptedAns){
                        pAcceptedAnsIds.push(ques.acceptedAns);
                        pAcceptedAnsObj[ques.acceptedAns] = index;
                      try{
                        let ans = await PANS.findOne({_id: ques.acceptedAns}).populate("user", {name: 1, picture: 1}).populate("replies.user", {name: 1, picture: 1});
                        let repliesList = [];
              
                        if(ans.replies.length > 0){
                          for(let i=0; i<ans.replies.length; i++){
                            let reply = ans.replies[i];
              
                            pRepliesIds.push(reply._id);
                            pRepliesObj[reply._id] = {answer: index, reply: i};
                            
                            repliesList.push({
                              _id: reply._id,
                              userId: reply.user._id,
                              userName: reply.user.name,
                              userPicture: reply.user.picture,
                              content: reply.content,
                              likes: reply.likes,
                              liked: false,
                              createdAt: reply.createdAt
                            });
                          }
                        }
              
                        resultAns = {
                          _id: ans._id,
                          userId: ans.user._id,
                          userName: ans.user.name,
                          picture: ans.user.picture,
                          content: ans.content,
                          upvotes: ans.likes,
                          createdAt: ans.createdAt,
                          ownedAt: ans.ownedAt,
                          upvoted: false,
                          replies: repliesList
                        }
              
                      }
                      catch(err){
                        console.log("Error from GET /questions/phone/by/:userId: ", err);
                        return res.status(500).json({
                          success: false,
                          status: "internal server error",
                          err: "finding the acceptedAnswer failed"
                        });
                      }
                    }
              
                    resultPques.push({
                      _id: ques._id,
                      type: "phone",
                      userId: ques.user._id,
                      userName: ques.user.name,
                      picture: ques.user.picture,
                      createdAt: ques.createdAt,
                      targetId: ques.phone._id,
                      targetName: ques.phone.name,
                      content: ques.content,
                      upvotes: ques.upvotes,
                      ansCount: ques.ansCount,
                      shares: ques.shares,
                      upvoted: false,
                      acceptedAns: resultAns
                    });
                }


                for(let [index, ques] of cQues.entries()){
                    cQuesIds.push(ques._id);
                    cQuesObj[ques._id] = index;
              
                    let resultAns = null;
                    if(ques.acceptedAns){
                        cAcceptedAnsIds.push(ques.acceptedAns);
                        cAcceptedAnsObj[ques.acceptedAns] = index;
                      try{
                        let ans = await CANS.findOne({_id: ques.acceptedAns}).populate("user", {name: 1, picture: 1}).populate("replies.user", {name: 1, picture: 1});
                        let repliesList = [];
              
                        if(ans.replies.length > 0){
                          for(let i=0; i<ans.replies.length; i++){
                            let reply = ans.replies[i];
              
                            cRepliesIds.push(reply._id);
                            cRepliesObj[reply._id] = {answer: index, reply: i};
                            
                            repliesList.push({
                              _id: reply._id,
                              userId: reply.user._id,
                              userName: reply.user.name,
                              userPicture: reply.user.picture,
                              content: reply.content,
                              likes: reply.likes,
                              liked: false,
                              createdAt: reply.createdAt
                            });
                          }
                        }
              
                        resultAns = {
                          _id: ans._id,
                          userId: ans.user._id,
                          userName: ans.user.name,
                          picture: ans.user.picture,
                          content: ans.content,
                          upvotes: ans.likes,
                          createdAt: ans.createdAt,
                          ownedAt: ans.ownedAt,
                          upvoted: false,
                          replies: repliesList
                        }
              
                      }
                      catch(err){
                        console.log("Error from GET /questions/company/by/:userId: ", err);
                        return res.status(500).json({
                          success: false,
                          status: "internal server error",
                          err: "finding the acceptedAnswer failed"
                        });
                      }
                    }
              
                    resultCques.push({
                      _id: ques._id,
                      type: "company",
                      userId: ques.user._id,
                      userName: ques.user.name,
                      picture: ques.user.picture,
                      createdAt: ques.createdAt,
                      targetId: ques.company._id,
                      targetName: ques.company.name,
                      content: ques.content,
                      upvotes: ques.upvotes,
                      ansCount: ques.ansCount,
                      shares: ques.shares,
                      upvoted: false,
                      acceptedAns: resultAns
                    });
                }


                // checkig liked state
                let proms1 = [];
                proms1.push(PHONE_REVS_LIKES.find({user: req.user._id, review: {$in: pRevsIdsList}, unliked: false}));
                proms1.push(COMPANY_REVS_LIKES.find({user: req.user._id, review: {$in: cRevsIdsList}, unliked: false}));
                proms1.push(PHONE_QUES_LIKES.find({user: req.user._id, question: {$in: pQuesIds}, unliked: false}));
                proms1.push(PQUES_ANSWERS_LIKES.find({user: req.user._id, answer: {$in: pAcceptedAnsIds}}));
                proms1.push(PQUES_REPLIES_LIKES.find({user: req.user._id, reply: {$in: pRepliesIds}}));
                proms1.push(COMPANY_QUES_LIKES.find({user: req.user._id, question: {$in: cQuesIds}, unliked: false}));
                proms1.push(CQUES_ANSWERS_LIKES.find({user: req.user._id, answer: {$in: cAcceptedAnsIds}}));
                proms1.push(CQUES_REPLIES_LIKES.find({user: req.user._id, reply: {$in: cRepliesIds}}));

                try{
                    let allLikes = await Promise.all(proms1);
                    let pRevsLikes = allLikes[0];
                    let cRevsLikes = allLikes[1];
                    let pQuesLikes = allLikes[2];
                    let pAnsLikes = allLikes[3];
                    let pRepliesLikes = allLikes[4];
                    let cQuesLikes = allLikes[5];
                    let cAnsLikes = allLikes[6];
                    let cRepliesLikes = allLikes[7];
                    
                    // checking liked state for phone reviews
                    for(let like of pRevsLikes){
                        resultPrevs[pRevsIds[like.review]].liked = true;
                    }


                    // checking liked state for company reviews
                    for(let like of cRevsLikes){
                        resultCrevs[cRevsIds[like.review]].liked = true;
                    }


                    // checking liked state for phone questions
                    for(let like of pQuesLikes){
                        let id = like.question;
                        resultPques[pQuesObj[id]].upvoted = true;
                    }
                
                    for(let like of pAnsLikes){
                        let id = like.answer;
                        resultPques[pAcceptedAnsObj[id]].acceptedAns.upvoted = true;
                    }
                
                    for(let like of pRepliesLikes){
                        let id = like.reply;
                        resultPques[pRepliesObj[id].answer].acceptedAns.replies[pRepliesObj[id].reply].liked = true;
                    }


                    // checking liked state for company questions
                    for(let like of cQuesLikes){
                        let id = like.question;
                        resultCques[cQuesObj[id]].upvoted = true;
                    }
                
                    for(let like of cAnsLikes){
                        let id = like.answer;
                        resultCques[cAcceptedAnsObj[id]].acceptedAns.upvoted = true;
                    }
                
                    for(let like of cRepliesLikes){
                        let id = like.reply;
                        resultCques[cRepliesObj[id].answer].acceptedAns.replies[cRepliesObj[id].reply].liked = true;
                    }

                    return res.status(200).json({
                        success: true,
                        phoneRevs: resultPrevs,
                        companyRevs: resultCrevs,
                        phoneQuestions: resultPques,
                        companyQuestions: resultCques
                    });

                }
                catch(err){
                    console.log("Error from /home/recommended: ", err);
                    return res.status(500).json({
                        success: false,
                        status: "internal server error",
                        err: "finding likes failed"
                    });
                }
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
    }
    else{
        // get recommendations for unauthenticated user
        try{
          let TIMEOUT = process.env.TIMEOUT || config.TIMEOUT;

          const {data: resp} = await axios.get(process.env.AI_LINK + "/all/" + "default" + "/recommend",
          {headers: {'X-Api-Key': process.env.AI_API_KEY}, params: {"round": roundNum}},
          {timeout: TIMEOUT, httpsAgent: new https.Agent({ keepAlive: true })});

          let pRevs = resp.phoneRevs;
          let cRevs = resp.companyRevs;
          let pQues = resp.phoneQuestions;
          let cQues = resp.companyQuestions;
          let totalIds = resp.total;
          
          let proms = [];
          proms.push(PREVS.find({_id: {$in: pRevs}}).populate("phone", {name: 1}).populate("user", {name: 1, picture: 1}));
          proms.push(CREVS.find({_id: {$in: cRevs}}).populate("company", {name: 1}).populate("user", {name: 1, picture: 1}));
          proms.push(PQUES.find({_id: {$in: pQues}}).populate("phone", {name: 1}).populate("user", {name: 1, picture: 1}));
          proms.push(CQUES.find({_id: {$in: cQues}}).populate("company", {name: 1}).populate("user", {name: 1, picture: 1}));

          Promise.all(proms)
          .then(async([pRevs, cRevs, pQues, cQues]) => {
              
              let pRevsIdsList = [];
              let pRevsIds = {};

              let cRevsIdsList = [];
              let cRevsIds = {};

              let pQuesIds = [];
              let pQuesObj = {};
              let pAcceptedAnsIds = [];
              let pAcceptedAnsObj = {};
              let pRepliesIds = [];
              let pRepliesObj = {};

              let cQuesIds = [];
              let cQuesObj = {};
              let cAcceptedAnsIds = [];
              let cAcceptedAnsObj = {};
              let cRepliesIds = [];
              let cRepliesObj = {};

              for(let [index, rev] of pRevs.entries()){

                  pRevsIdsList.push(rev._id);
                  pRevsIds[rev._id] = index;

                  resultPrevs.push({
                      _id: rev._id,
                      type: "phone",
                      targetId: rev.phone._id,
                      targetName: rev.phone.name,
                      userId: rev.user._id,
                      userName: rev.user.name,
                      picture: rev.user.picture,
                      createdAt: rev.createdAt,
                      views: rev.views,
                      likes: rev.likes,
                      commentsCount: rev.commentsCount,
                      shares: rev.shares,
                      ownedAt: rev.ownedDate,
                      generalRating: rev.generalRating,
                      uiRating: rev.uiRating,
                      manufacturingQuality: rev.manQuality,
                      valueForMoney: rev.valFMon,
                      camera: rev.camera,
                      callQuality: rev.callQuality,
                      battery: rev.batteryRating,
                      pros: rev.pros,
                      cons: rev.cons,
                      liked: false
                  });
              }


              for(let [index, rev] of cRevs.entries()){

                  cRevsIdsList.push(rev._id);
                  cRevsIds[rev._id] = index;

                  resultCrevs.push({
                      _id: rev._id,
                      type: "company",
                      targetId: rev.company._id,
                      targetName: rev.company.name,
                      userId: rev.user._id._id,
                      userName: rev.user.name,
                      picture: rev.user.picture,
                      createdAt: rev.createdAt,
                      views: rev.views,
                      likes: rev.likes,
                      commentsCount: rev.commentsCount,
                      shares: rev.shares,
                      corresPhoneRev: rev.corresPrev,
                      generalRating: rev.generalRating,
                      pros: rev.pros,
                      cons: rev.cons,
                      liked: false
                  });
              }


              for(let [index, ques] of pQues.entries()){
                  pQuesIds.push(ques._id);
                  pQuesObj[ques._id] = index;
            
                  let resultAns = null;
                  if(ques.acceptedAns){
                      pAcceptedAnsIds.push(ques.acceptedAns);
                      pAcceptedAnsObj[ques.acceptedAns] = index;
                    try{
                      let ans = await PANS.findOne({_id: ques.acceptedAns}).populate("user", {name: 1, picture: 1}).populate("replies.user", {name: 1, picture: 1});
                      let repliesList = [];
            
                      if(ans.replies.length > 0){
                        for(let i=0; i<ans.replies.length; i++){
                          let reply = ans.replies[i];
            
                          pRepliesIds.push(reply._id);
                          pRepliesObj[reply._id] = {answer: index, reply: i};
                          
                          repliesList.push({
                            _id: reply._id,
                            userId: reply.user._id,
                            userName: reply.user.name,
                            userPicture: reply.user.picture,
                            content: reply.content,
                            likes: reply.likes,
                            liked: false,
                            createdAt: reply.createdAt
                          });
                        }
                      }
            
                      resultAns = {
                        _id: ans._id,
                        userId: ans.user._id,
                        userName: ans.user.name,
                        picture: ans.user.picture,
                        content: ans.content,
                        upvotes: ans.likes,
                        createdAt: ans.createdAt,
                        ownedAt: ans.ownedAt,
                        upvoted: false,
                        replies: repliesList
                      }
            
                    }
                    catch(err){
                      console.log("Error from GET /questions/phone/by/:userId: ", err);
                      return res.status(500).json({
                        success: false,
                        status: "internal server error",
                        err: "finding the acceptedAnswer failed"
                      });
                    }
                  }
            
                  resultPques.push({
                    _id: ques._id,
                    type: "phone",
                    userId: ques.user._id,
                    userName: ques.user.name,
                    picture: ques.user.picture,
                    createdAt: ques.createdAt,
                    targetId: ques.phone._id,
                    targetName: ques.phone.name,
                    content: ques.content,
                    upvotes: ques.upvotes,
                    ansCount: ques.ansCount,
                    shares: ques.shares,
                    upvoted: false,
                    acceptedAns: resultAns
                  });
              }


              for(let [index, ques] of cQues.entries()){
                  cQuesIds.push(ques._id);
                  cQuesObj[ques._id] = index;
            
                  let resultAns = null;
                  if(ques.acceptedAns){
                      cAcceptedAnsIds.push(ques.acceptedAns);
                      cAcceptedAnsObj[ques.acceptedAns] = index;
                    try{
                      let ans = await CANS.findOne({_id: ques.acceptedAns}).populate("user", {name: 1, picture: 1}).populate("replies.user", {name: 1, picture: 1});
                      let repliesList = [];
            
                      if(ans.replies.length > 0){
                        for(let i=0; i<ans.replies.length; i++){
                          let reply = ans.replies[i];
            
                          cRepliesIds.push(reply._id);
                          cRepliesObj[reply._id] = {answer: index, reply: i};
                          
                          repliesList.push({
                            _id: reply._id,
                            userId: reply.user._id,
                            userName: reply.user.name,
                            userPicture: reply.user.picture,
                            content: reply.content,
                            likes: reply.likes,
                            liked: false,
                            createdAt: reply.createdAt
                          });
                        }
                      }
            
                      resultAns = {
                        _id: ans._id,
                        userId: ans.user._id,
                        userName: ans.user.name,
                        picture: ans.user.picture,
                        content: ans.content,
                        upvotes: ans.likes,
                        createdAt: ans.createdAt,
                        ownedAt: ans.ownedAt,
                        upvoted: false,
                        replies: repliesList
                      }
            
                    }
                    catch(err){
                      console.log("Error from GET /questions/company/by/:userId: ", err);
                      return res.status(500).json({
                        success: false,
                        status: "internal server error",
                        err: "finding the acceptedAnswer failed"
                      });
                    }
                  }
            
                  resultCques.push({
                    _id: ques._id,
                    type: "company",
                    userId: ques.user._id,
                    userName: ques.user.name,
                    picture: ques.user.picture,
                    createdAt: ques.createdAt,
                    targetId: ques.company._id,
                    targetName: ques.company.name,
                    content: ques.content,
                    upvotes: ques.upvotes,
                    ansCount: ques.ansCount,
                    shares: ques.shares,
                    upvoted: false,
                    acceptedAns: resultAns
                  });
              }
              console.log("-----------------AI Recommendation Success-----------------");
              return res.status(200).json({
                success: true,
                phoneRevs: resultPrevs,
                companyRevs: resultCrevs,
                phoneQuestions: resultPques,
                companyQuestions: resultCques,
                total: totalIds
            });

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
          console.log("-----------------AI Recommendation Failed-----------------", err.response.status, err.response.data);
          // Apply backup routine
          let itemsPerRound = parseInt((process.env.HOME_SCREEN|| config.HOME_SCREEN));
          
          let proms = [];
          proms.push(PREVS.find({}).sort({likes: -1, commentsCount: -1}).skip((roundNum - 1) * itemsPerRound).limit(itemsPerRound).populate("phone", {name: 1}).populate("user", {name: 1, picture: 1}));
          proms.push(CREVS.find({}).sort({likes: -1, commentsCount: -1}).skip((roundNum - 1) * itemsPerRound).limit(itemsPerRound).populate("company", {name: 1}).populate("user", {name: 1, picture: 1}));
          proms.push(PQUES.find({}).sort({upvotes: -1, ansCount: -1}).skip((roundNum - 1) * itemsPerRound).limit(itemsPerRound).populate("phone", {name: 1}).populate("user", {name: 1, picture: 1}));
          proms.push(CQUES.find({}).sort({upvotes: -1, ansCount: -1}).skip((roundNum - 1) * itemsPerRound).limit(itemsPerRound).populate("company", {name: 1}).populate("user", {name: 1, picture: 1}));
        
          Promise.all(proms)
          .then(async([pRevs, cRevs, pQues, cQues]) => {
              
              let pRevsIdsList = [];
              let pRevsIds = {};

              let cRevsIdsList = [];
              let cRevsIds = {};

              let pQuesIds = [];
              let pQuesObj = {};
              let pAcceptedAnsIds = [];
              let pAcceptedAnsObj = {};
              let pRepliesIds = [];
              let pRepliesObj = {};

              let cQuesIds = [];
              let cQuesObj = {};
              let cAcceptedAnsIds = [];
              let cAcceptedAnsObj = {};
              let cRepliesIds = [];
              let cRepliesObj = {};

              for(let [index, rev] of pRevs.entries()){

                  pRevsIdsList.push(rev._id);
                  pRevsIds[rev._id] = index;

                  resultPrevs.push({
                      _id: rev._id,
                      type: "phone",
                      targetId: rev.phone._id,
                      targetName: rev.phone.name,
                      userId: rev.user._id,
                      userName: rev.user.name,
                      picture: rev.user.picture,
                      createdAt: rev.createdAt,
                      views: rev.views,
                      likes: rev.likes,
                      commentsCount: rev.commentsCount,
                      shares: rev.shares,
                      ownedAt: rev.ownedDate,
                      generalRating: rev.generalRating,
                      uiRating: rev.uiRating,
                      manufacturingQuality: rev.manQuality,
                      valueForMoney: rev.valFMon,
                      camera: rev.camera,
                      callQuality: rev.callQuality,
                      battery: rev.batteryRating,
                      pros: rev.pros,
                      cons: rev.cons,
                      liked: false
                  });
              }


              for(let [index, rev] of cRevs.entries()){

                  cRevsIdsList.push(rev._id);
                  cRevsIds[rev._id] = index;

                  resultCrevs.push({
                      _id: rev._id,
                      type: "company",
                      targetId: rev.company._id,
                      targetName: rev.company.name,
                      userId: rev.user._id,
                      userName: rev.user.name,
                      picture: rev.user.picture,
                      createdAt: rev.createdAt,
                      views: rev.views,
                      likes: rev.likes,
                      commentsCount: rev.commentsCount,
                      shares: rev.shares,
                      corresPhoneRev: rev.corresPrev,
                      generalRating: rev.generalRating,
                      pros: rev.pros,
                      cons: rev.cons,
                      liked: false
                  });
              }


              for(let [index, ques] of pQues.entries()){
                  pQuesIds.push(ques._id);
                  pQuesObj[ques._id] = index;
            
                  let resultAns = null;
                  if(ques.acceptedAns){
                      pAcceptedAnsIds.push(ques.acceptedAns);
                      pAcceptedAnsObj[ques.acceptedAns] = index;
                    try{
                      let ans = await PANS.findOne({_id: ques.acceptedAns}).populate("user", {name: 1, picture: 1}).populate("replies.user", {name: 1, picture: 1});
                      let repliesList = [];
            
                      if(ans.replies.length > 0){
                        for(let i=0; i<ans.replies.length; i++){
                          let reply = ans.replies[i];
            
                          pRepliesIds.push(reply._id);
                          pRepliesObj[reply._id] = {answer: index, reply: i};
                          
                          repliesList.push({
                            _id: reply._id,
                            userId: reply.user._id,
                            userName: reply.user.name,
                            userPicture: reply.user.picture,
                            content: reply.content,
                            likes: reply.likes,
                            liked: false,
                            createdAt: reply.createdAt
                          });
                        }
                      }
            
                      resultAns = {
                        _id: ans._id,
                        userId: ans.user._id,
                        userName: ans.user.name,
                        picture: ans.user.picture,
                        content: ans.content,
                        upvotes: ans.likes,
                        createdAt: ans.createdAt,
                        ownedAt: ans.ownedAt,
                        upvoted: false,
                        replies: repliesList
                      }
            
                    }
                    catch(err){
                      console.log("Error from GET /questions/phone/by/:userId: ", err);
                      return res.status(500).json({
                        success: false,
                        status: "internal server error",
                        err: "finding the acceptedAnswer failed"
                      });
                    }
                  }
            
                  resultPques.push({
                    _id: ques._id,
                    type: "phone",
                    userId: ques.user._id,
                    userName: ques.user.name,
                    picture: ques.user.picture,
                    createdAt: ques.createdAt,
                    targetId: ques.phone._id,
                    targetName: ques.phone.name,
                    content: ques.content,
                    upvotes: ques.upvotes,
                    ansCount: ques.ansCount,
                    shares: ques.shares,
                    upvoted: false,
                    acceptedAns: resultAns
                  });
              }


              for(let [index, ques] of cQues.entries()){
                  cQuesIds.push(ques._id);
                  cQuesObj[ques._id] = index;
            
                  let resultAns = null;
                  if(ques.acceptedAns){
                      cAcceptedAnsIds.push(ques.acceptedAns);
                      cAcceptedAnsObj[ques.acceptedAns] = index;
                    try{
                      let ans = await CANS.findOne({_id: ques.acceptedAns}).populate("user", {name: 1, picture: 1}).populate("replies.user", {name: 1, picture: 1});
                      let repliesList = [];
            
                      if(ans.replies.length > 0){
                        for(let i=0; i<ans.replies.length; i++){
                          let reply = ans.replies[i];
            
                          cRepliesIds.push(reply._id);
                          cRepliesObj[reply._id] = {answer: index, reply: i};
                          
                          repliesList.push({
                            _id: reply._id,
                            userId: reply.user._id,
                            userName: reply.user.name,
                            userPicture: reply.user.picture,
                            content: reply.content,
                            likes: reply.likes,
                            liked: false,
                            createdAt: reply.createdAt
                          });
                        }
                      }
            
                      resultAns = {
                        _id: ans._id,
                        userId: ans.user._id,
                        userName: ans.user.name,
                        picture: ans.user.picture,
                        content: ans.content,
                        upvotes: ans.likes,
                        createdAt: ans.createdAt,
                        ownedAt: ans.ownedAt,
                        upvoted: false,
                        replies: repliesList
                      }
            
                    }
                    catch(err){
                      console.log("Error from GET /questions/company/by/:userId: ", err);
                      return res.status(500).json({
                        success: false,
                        status: "internal server error",
                        err: "finding the acceptedAnswer failed"
                      });
                    }
                  }
            
                  resultCques.push({
                    _id: ques._id,
                    type: "company",
                    userId: ques.user._id,
                    userName: ques.user.name,
                    picture: ques.user.picture,
                    createdAt: ques.createdAt,
                    targetId: ques.company._id,
                    targetName: ques.company.name,
                    content: ques.content,
                    upvotes: ques.upvotes,
                    ansCount: ques.ansCount,
                    shares: ques.shares,
                    upvoted: false,
                    acceptedAns: resultAns
                  });
              }


              return res.status(200).json({
                success: true,
                phoneRevs: resultPrevs,
                companyRevs: resultCrevs,
                phoneQuestions: resultPques,
                companyQuestions: resultCques
            });
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
    }
});



module.exports = homeRouter;