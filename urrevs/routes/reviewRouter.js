/*
  Author: Abdelrahman Hany
  Created on: 1-May-2022
*/

const express = require("express");
const axios = require("axios");
const https = require("https");
const fs = require("fs");
const useragent = require("express-useragent");
const useragentParser = require('ua-parser-js');

const reviewRouter = express.Router();

const cors = require("../utils/cors");
const rateLimit = require("../utils/rateLimit/regular");
const authenticate = require("../utils/authenticate");
const likeComment = require("../utils/likeCommentOrAnswer");
const unlikeComment = require("../utils/unlikeCommentOrAnswer");
const unlikeReply = require("../utils/unlikeReply");
const likeReply = require("../utils/likeReply");
const addReply = require("../utils/addReply");
const increaseViews = require("../utils/increaseViews");
const increaseShares = require("../utils/increaseShares");
const addComment = require("../utils/addComment");
const lameTrack = require("../utils/lameTrack");
const mapUaToPhones = require("../utils/mapUaToPhones");
const isThereAcompetition = require("../utils/isThereAcompetition");

const USER = require("../models/user");
const PHONE = require("../models/phone");
const COMPANY = require("../models/company");
const CONSTANT = require("../models/constants");
const PHONEREV = require("../models/phoneReview");
const COMPANYREV = require("../models/companyReview");
const OWNED_PHONE = require("../models/ownedPhone");
const PHONE_REVS_LIKES = require("../models/phoneRevsLikes");
const COMPANY_REVS_LIKES = require("../models/companyRevsLikes");
const PHONE_REVS_UNLIKES = require("../models/phoneRevsUnlikes");
const COMPANY_REVS_UNLIKES = require("../models/companyRevsUnlikes");
const PHONE_REVS_COMMENTS = require("../models/phoneReviewComment");
const COMPANY_REVS_COMMENTS = require("../models/companyReviewComment");
const PHONE_REV_COMMENTS_LIKES = require("../models/phoneReviewCommentLike");
const COMPANY_REV_COMMENTS_LIKES = require("../models/companyReviewCommentLike");
const PHONE_REV_REPLIES_LIKES = require("../models/phoneReviewReplyLike");
const COMPANY_REV_REPLIES_LIKES = require("../models/companyReviewReplyLike");
const PHONE_REV_HATED = require("../models/phoneRevsHated");
const PHONE_REV_SEE_MORE = require("../models/phoneRevsSeeMore");
const PHONE_REV_FULL_SCREEN = require("../models/phoneRevsFullScreen");
const COMPANY_REVS_HATED = require("../models/companyRevsHated");
const COMPANY_REVS_SEE_MORE = require("../models/companyRevsSeeMore");
const COMPANY_REVS_FULL_SCREEN = require("../models/companyRevsFullScreen");
const PHONE_REVS_HIDDEN = require("../models/phoneRevsHidden");
const COMPANY_REVS_HIDDEN = require("../models/companyRevsHidden");
const PHONE_REVS_UNHIDDEN = require("../models/phoneRevsUnhidden");
const COMPANY_REVS_UNHIDDEN = require("../models/companyRevsUnhidden");


const config = require("../config");

//--------------------------------------------------------------------

reviewRouter.options("*", cors.cors, (req, res, next)=>{
  res.sendStatus(200);
});

// Endpoints Implementation


// Add a phone review (with embedded company review)
/*
  steps:
  check if the user is not blocked from posting reviews
                PRE-CREATION
  1- extract data from request body
  2- checking if the required fields are provided and in correct data type
  3- checking if the phone exists
  4- checking if the company exists
  5- checking if the user has already reviewed the phone
  6- checking if the phone and company are matched
  7- check if the the phone review, company review, and ownedPhone can be verified or not
                 
                CREATION
  7- create the phone review
  8- create the company review

                POST-CREATION
  9- calculate the average company rating
  10- calculate the average generalRating for the phone
  11- calculate the average uiRating for the phone
  12- calculate the average manQuality for the phone
  13- calculate the average valFMon for the phone
  14- calculate the average cam for the phone
  15- calculate the average callQuality for the phone
  16- calculate the average batteryRating for the phone
  17- increase the total reviews count in the company
  18- increase the total reviews count in the phone
  19- add the phone to the owned phones for the user
  20- calculate the points to give to the user using either AI service or the backup routine
  21- give points to the user
  22- give points to the referral (if exists) (the referral must not be the user himself)
  23- send the phone review as a response
*/

reviewRouter.post("/phone", cors.cors, rateLimit, authenticate.verifyUser, async(req, res, next)=>{
  
  if(req.user.blockedFromReviews){
    return res.status(403).json({
      success: false,
      status: "blocked"
    });
  }
  
  // extract data from request body  
  let {
    phoneId,
    companyId,
    ownedDate,
    generalRating,
    uiRating,
    manQuality,
    valFMon,
    camera,
    callQuality,
    battery,
    pros,
    cons,
    companyRating,
    compPros,
    compCons,
    refCode,
} = req.body;

  // checking if the required fields are provided  
  if(!phoneId || !ownedDate || !generalRating || !uiRating || !manQuality || !valFMon 
    || !camera || !callQuality || !battery || !pros || !cons || !companyRating || !compPros 
    || !compCons || !companyId){
      return res.status(400).json({
        success: false,
        status: "bad request"
      });
  }

  if(!(Date.parse(ownedDate))){
    return res.status(400).json({
      success: false,
      status: "bad request"
    });
  }

  if(Date.parse(ownedDate) > Date.now()){
    return res.status(400).json({
      success: false,
      status: "invalid date"
    });
  }

  if(typeof(generalRating) !== "number" || typeof(uiRating) !== "number" || 
  typeof(manQuality) !== "number" || typeof(valFMon) !== "number" || typeof(camera) !== "number" || 
  typeof(callQuality) !== "number" || typeof(battery) !== "number" || typeof(companyRating) !== "number"){
    return res.status(400).json({
      success: false,
      status: "bad request"
    });
  }

  if(!((generalRating >= 1 && generalRating <= 5) && (uiRating >= 1 && uiRating <= 5) && 
  (manQuality >= 1 && manQuality <= 5) && (valFMon >= 1 && valFMon <= 5) && 
  (camera >= 1 && camera <= 5) && (callQuality >= 1 && callQuality <= 5) && 
  (battery >= 1 && battery <= 5) && (companyRating >= 1 && companyRating <= 5))){
    return res.status(400).json({
      success: false,
      status: "bad request"
    });
  }

  if(typeof(pros) !== "string" || typeof(cons) !== "string" || typeof(compPros) !== "string" || typeof(compCons) !== "string"){
    return res.status(400).json({
      success: false,
      status: "bad request"
    });
  }

  if(refCode && !(typeof(refCode) == "string" && (refCode.match(/ur[0-9]+/i)))){
    return res.status(400).json({
      success: false,
      status: "bad request"
    });
  }

  if(refCode){
    refCode = refCode.toUpperCase();
  }

  pros = pros.trim();
  cons = cons.trim();
  compPros = compPros.trim();
  compCons = compCons.trim();

  if(pros == "" || cons == "" || compPros == "" || compCons == ""){
    return res.status(400).json({
      success: false,
      status: "bad request"
    });
  }

  // check if there is a currently running competition or not
  let isCompetition = false;
  try{
    isCompetition = await isThereAcompetition();
  }
  catch(result){
    isCompetition = result;
  }

  let bonusPoints = 0; // if there is a valid referral code entered, the reviewer will get bonus points equal to the referral rev points
  let bonusVerificationPoints = 0;
  // checking if the phone exists - checking if the company exists - checking if the user has already reviewed the phone - give points to the referral (if exists). the referral must not be the user himself
  let stage1Proms = [];
  stage1Proms.push(PHONE.findById(phoneId));
  stage1Proms.push(COMPANY.findById(companyId));
  stage1Proms.push(OWNED_PHONE.find({user: req.user._id}, {phone: 1, verificationRatio: 1}));
  if(refCode){
    stage1Proms.push(USER.findOneAndUpdate({refCode: refCode, _id: {$ne: req.user._id}}, {$inc: {comPoints: (isCompetition)?parseInt(process.env.REFFERAL_REV_POINTS || config.REFFERAL_REV_POINTS):0, absPoints: parseInt(process.env.REFFERAL_REV_POINTS || config.REFFERAL_REV_POINTS)}}));
    bonusPoints = parseInt(process.env.REFFERAL_REV_POINTS || config.REFFERAL_REV_POINTS);
  }
  
  // checking verification
  let verificationRatio = 0;

  let uA = req.headers['user-agent'];
  let uAObj = useragent.parse(uA);
  let modelName;

  if(uAObj.isMobile){
    if(!uAObj.isiPhone){
      let parsedUa = useragentParser(uA);
      modelName = parsedUa.device.model;
      if(!(modelName == null || modelName.match(/^\s*$/))){
        modelName = modelName.trim();
        let vendor = parsedUa.device.vendor;
        vendor = (vendor == null)? "": vendor.trim();
        let regex = `,(${vendor})?\\s*${modelName},`;
        stage1Proms.push(PHONE.find({otherNames: {$regex: regex, $options: "i"}}, {name: 1}));
      }
    }
  }

  Promise.all(stage1Proms).then(async(stage1Results)=>{
    let phone = stage1Results[0];
    let company = stage1Results[1];
    let owned = stage1Results[2];
    let resultIndex = (refCode)? 4: 3;
    let phonesWithTheSameModelName = (stage1Results[resultIndex]) ? stage1Results[resultIndex] : [];
    
    if(!phone || !company){
      return res.status(404).json({
        success: false,
        status: "phone or company not found"
      });
    }
    
    if(Date.parse(ownedDate) < Date.parse(phone.releaseDate)){
      return res.status(400).json({
        success: false,
        status: "past date"
      });
    }

    // you can't review the same phone twice
    // you can't have more than x unverified reviews
    let x = parseInt(process.env.MAX_UNVERIFIED_REVIEWS || config.MAX_UNVERIFIED_REVIEWS);
    let maxVerified = parseInt(process.env.MAX_VERIFIED_REVIEWS || config.MAX_VERIFIED_REVIEWS);
    let numUnverified = 0;
    let numVerified = 0;
    for(let p of owned){

      if(p.phone.equals(phoneId)){
        return res.status(403).json({
          success: false,
          status: "already reviewed"
        });
      }

      if(p.verificationRatio == 0){
        numUnverified += 1;
      }
      else{
        numVerified += 1;
      }
    }

    // checking if the phone and company are matched
    if(!(phone.company.equals(companyId))){
      return res.status(400).json({
        success: false,
        status: "phone and company do not match"
      });
    }

    if(refCode){
      let referral = stage1Results[3];
      if(!referral){
        return res.status(400).json({
          success: false,
          status: "invalid referral code"
        });
      }
    }

    if(uAObj.isiPhone){
      if(phone.company.equals((process.env.IPHONE_COMPANY || config.IPHONE_COMPANY))){
        verificationRatio = -1;
      }
    }
    else{
      let listLength = phonesWithTheSameModelName.length
      if(listLength > 0){
         for(let possiblePhone of phonesWithTheSameModelName){
          if(possiblePhone.name == phone.name){
            verificationRatio = (1 / listLength) * 100;
            break;
          }
         }
      }
      else if(!(modelName == null || modelName.match(/^\s*$/))){
        let newPhones = [];
        try{
          newPhones = await mapUaToPhones(uA, "," + modelName + ",", null, null, true);
        }
        catch(err){
          console.log(err);
        }
        
        if(newPhones.length > 0){
          for(let possiblePhone of newPhones){
            if(possiblePhone.name == phone.name){
              verificationRatio = (1 / newPhones.length) * 100;
              break;
            }
           }
        }
      }
    }

    if(verificationRatio == 0){
      numUnverified += 1;
      if(numUnverified > x){
        return res.status(403).json({
          success: false,
          status: "too many unverified"
        });
      }
    }
    else{
      if(numVerified + 1 > maxVerified){
        return res.status(403).json({
          success: false,
          status: "too many verified"
        });
      }
      if(verificationRatio == -1){
        bonusVerificationPoints = parseInt(process.env.VERIFICATION_REV_POINTS_APPLE || config.VERIFICATION_REV_POINTS_APPLE);
  
      }
      else{
        bonusVerificationPoints = parseInt(process.env.VERIFICATION_REV_POINTS_ANDROID || config.VERIFICATION_REV_POINTS_ANDROID);
      }
    }
    
    // calculate the average company rating
    let oldAvgRating = company.avgRating;
    let oldTotalRevs = company.totalRevsCount;
    let newAvgRating = ((oldAvgRating * oldTotalRevs) + companyRating) / (oldTotalRevs + 1);

    /* 
        calculate the average generalRating for the phone
        calculate the average uiRating for the phone
        calculate the average manQuality for the phone
        calculate the average valFMon for the phone
        calculate the average cam for the phone
        calculate the average callQuality for the phone
        calculate the average batteryRating for the phone
    */

    let oldTotalRevsPhone = phone.totalRevsCount;

    // calculate the average generalRating for the phone
    let oldGeneralRating = phone.generalRating;
    let newGeneralRating = ((oldGeneralRating * oldTotalRevsPhone) + generalRating) / (oldTotalRevsPhone + 1);
    
    // calculate the average uiRating for the phone
    let oldUiRating = phone.uiRating;
    let newUiRating = ((oldUiRating * oldTotalRevsPhone) + uiRating) / (oldTotalRevsPhone + 1);

    // calculate the average manQuality for the phone
    let oldManQuality = phone.manQuality;
    let newManQuality = ((oldManQuality * oldTotalRevsPhone) + manQuality) / (oldTotalRevsPhone + 1);

    // calculate the average valFMon for the phone
    let oldValFMon = phone.valFMon;
    let newValFMon = ((oldValFMon * oldTotalRevsPhone) + valFMon) / (oldTotalRevsPhone + 1);

    // calculate the average cam for the phone
    let oldCam = phone.cam;
    let newCam = ((oldCam * oldTotalRevsPhone) + camera) / (oldTotalRevsPhone + 1);
    
    // calculate the average callQuality for the phone
    let oldCallQuality = phone.callQuality;
    let newCallQuality = ((oldCallQuality * oldTotalRevsPhone) + callQuality) / (oldTotalRevsPhone + 1);

    // calculate the average batteryRating for the phone
    let oldBatteryRating = phone.batteryRating;
    let newBatteryRating = ((oldBatteryRating * oldTotalRevsPhone) + battery) / (oldTotalRevsPhone + 1);

    // increase the total reviews count in the company - increase the total reviews count in the phone - add the phone to the owned phones for the user
    let staeg2Proms = [];
    staeg2Proms.push(COMPANY.findByIdAndUpdate(companyId, {$inc: {totalRevsCount: 1}, $set: {avgRating: newAvgRating}}));
    staeg2Proms.push(PHONE.findByIdAndUpdate(phoneId, {$inc: {totalRevsCount: 1}, $set: {generalRating: newGeneralRating, uiRating: newUiRating, manQuality: newManQuality, valFMon: newValFMon, cam: newCam, callQuality: newCallQuality, batteryRating: newBatteryRating}}));
    staeg2Proms.push(OWNED_PHONE.create({user: req.user._id, phone: phoneId, ownedAt: ownedDate, company: companyId, verificationRatio: verificationRatio}));
    
    Promise.all(staeg2Proms).then(async(staeg2Results)=>{
      
      // calculate the points to give to the user using either AI service or the backup routine
      let grade;
      // let's try to communicate to the AI service
      try{
        let TIMEOUT = process.env.TIMEOUT || config.TIMEOUT;
        var axiosConfig = {
          method: 'post',
          url: process.env.AI_LINK + '/reviews/grade',
          headers: { 
            'x-api-key': process.env.AI_API_KEY, 
            'Content-Type': 'application/json'
          },
          data : JSON.stringify({phoneRevPros: pros, phoneRevCons: cons, companyRevPros: compPros, companyRevCons: compCons}),
          timeout: TIMEOUT,
          httpsAgent: new https.Agent({ keepAlive: true })
        };
        
        const {data:resp} = await axios(axiosConfig);
        
        grade = resp.grade;
        console.log("--------------------Review grading AI Success--------------------");
      }
      catch(e){
        console.log("--------------------Review grading AI Failed---------------------");
        console.log(e.response.status, e.response.data);
        //console.log(e);
        // since the AI service is down, we will use the backup routine

        // read the stop words file
        let stopWords = fs.readFileSync("./stopwords.txt", "utf8").split("\r\n");
        // console.log(stopWords);
        // tokenize the pros, cons, compPros, compCons
        let tokenizedPros = pros.split(" ");
        let tokenizedCons = cons.split(" ");
        let tokenizeCompPros = compPros.split(" ");
        let tokenizeCompCons = compCons.split(" ");
        let tokenizedReview = tokenizedPros.concat(tokenizedCons, tokenizeCompPros, tokenizeCompCons);
        // remove the stop words from the tokenized pros, cons, compPros, compCons
        let filtered_review = tokenizedReview.filter(word=>{
          return !(stopWords.includes(word));
        });
        let count_filtered = filtered_review.length;
        let max_count = parseInt((process.env.MAX_COUNT || config.MAX_COUNT));
        let minCount = parseInt((process.env.MIN_COUNT || config.MIN_COUNT));
        grade = 30 * (count_filtered - minCount) / (max_count - minCount) + 10;
        grade = Math.round(grade);

        let MAX_GRADE = parseInt(process.env.MAX_GRADE || config.MAX_GRADE);
        let MIN_GRADE = parseInt(process.env.MIN_GRADE || config.MIN_GRADE);

        if(grade > MAX_GRADE){
          grade = MAX_GRADE;
        }
        else if(grade < MIN_GRADE){
          grade = MIN_GRADE;
        }
      }

      // give points to the user
      let staeg3Proms = [];
      let overallUserGrade = grade + bonusPoints + bonusVerificationPoints;
      staeg3Proms.push(USER.findByIdAndUpdate(req.user._id, {$inc: {comPoints: (isCompetition)?overallUserGrade:0, absPoints: overallUserGrade}}));
      staeg3Proms.push(PHONEREV.create({
        user: req.user._id,
        phone: phoneId,
        ownedDate: ownedDate,
        generalRating: generalRating,
        uiRating: uiRating,
        manQuality: manQuality,
        valFMon: valFMon,
        camera: camera,
        callQuality: callQuality,
        batteryRating: battery,
        pros: pros,
        cons: cons,
        verificationRatio: verificationRatio,
        totalGrade: grade
      }))

      Promise.all(staeg3Proms).then((staeg3Results)=>{
        
        let user = staeg3Results[0];
        let prev = staeg3Results[1];

        COMPANYREV.create({
          user: req.user._id,
          company: companyId,
          generalRating: companyRating,
          pros: compPros,
          cons: compCons,
          corresPrev: prev._id,
          verificationRatio: verificationRatio,
          totalGrade: grade
        })
        .then((crev)=>{
          // send the phone review as a response
          let resultRev = {
            _id: prev._id,
            type: "phone",
            createdAt: prev.createdAt,
            phoneId: phoneId,
            phoneName: phone.name,
            userId: req.user._id,
            userName: user.name,
            picture: user.picture,
            ownedAt: ownedDate,
            views: prev.views,
            likes: prev.likes,
            commentsCount: prev.commentsCount,
            shares: prev.shares,
            generalRating: generalRating,
            uiRating: uiRating,
            manufacturingQuality: manQuality,
            valueForMoney: valFMon,
            camera: camera,
            callQuality: callQuality,
            battery: battery,
            pros: pros,
            cons: cons,
            verificationRatio: verificationRatio
          }
          res.status(200).json({
            success: true,
            review: resultRev,
            earnedPoints: overallUserGrade,
            useMobile: (uAObj.isMobile) ? true : false
          });
        })
        .catch((err)=>{
          console.log("Error from /reviews/phone: ", err);
          return res.status(500).json({
            success: false,
            status: "internal servere error",
            err: "Error creating the company review"
          });
        });
      })
      .catch((err)=>{
        console.log("Error from /reviews/phone: ", err);
        return res.status(500).json({
          success: false,
          status: "internal servere error",
          err: "Either giving the user or the referral points failed or creating the phone review failed"
        });
      });
    })
    .catch((err)=>{
        console.log("Error from /reviews/phone: ", err);
        return res.status(500).json({
          success: false,
          status: "internal server error",
          err: "Either updaing the average rating or adding the phone to the owned phones failed - the phone and company reviews are created successfully"
        });
      // delete the previously created phone and company reviews
      // let deleteProms = [];
      // deleteProms.push(PHONEREV.findByIdAndDelete(prev._id));
      // deleteProms.push(COMPANYREV.findByIdAndDelete(crev._id));
      // Promise.all(deleteProms).then(()=>{
      //   console.log("Error from /reviews/phone: ", err);
      //   return res.status(500).json({
      //     success: false,
      //     status: "internal server error",
      //     err: "Either updaing the average rating or adding the phone to the owned phones failed - successfully deleted the phone and company reviews"
      //   });
      // })
      // .catch((err2)=>{
      //   console.log("Error from /reviews/phone: ", err, "also there is an error deleting the reviews: ", err2);
      //   return res.status(500).json({
      //     success: false,
      //     status: "internal server error",
      //     err: "Either updaing the average rating or adding the phone to the owned phones failed - Either deleting the phone and company reviews failed"
      //   });
      // });
    });
  })
  .catch((err)=>{
    console.log("Error from POST /reviews/phone: ", err);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: "Either finding the phone, the company, the phone review failed"
    });
  });
});



// Get a certain phone review
reviewRouter.get("/phone/:revId", cors.cors, rateLimit, authenticate.verifyFlexible, (req, res, next)=>{
  PHONEREV.findOneAndUpdate({_id: req.params.revId, hidden: false}, {$inc: {views: 1}})
  .populate("user", {name: 1, picture: 1})
  .populate("phone", {name: 1})
  .then(async (rev)=>{
    if(!rev){
      return res.status(404).json({
        success: false,
        status: "not found"
      });
    }
    
    try{
      await USER.findByIdAndUpdate(rev.user._id, {$inc: {totalViews: 1}});
    }
    catch(err){
      console.log("Error from GET /reviews/phone/:revId WHILE INCREASING THE TOTAL VIEWS COUNT OF A REVIEW AUTHOR: ", err);
    }

    let resultRev = {
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
      liked: false,
      verificationRatio: rev.verificationRatio
    };

    // request is done by a user
    if(req.user){
      // check the liked state
      let like;
      try{
        like = await PHONE_REVS_LIKES.findOne({user: req.user._id, review: rev._id, unliked: false});
      }
      catch(err){
        console.log("Error from /reviews/phone/:revId: ", err);
        return res.status(500).json({
          success: false,
          status: "internal server error",
          err: "Finding the liked state failed"
        });
      }
      if(like){
        resultRev.liked = true;
      }
    }

    res.status(200).json({
      success: true,
      review: resultRev
    });

  })
  .catch((err)=>{
    console.log("Error from GET /reviews/phone/:revId: ", err);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: "Finding the phone review failed"
    });
  });
});





// Get a certain company review
reviewRouter.get("/company/:revId", cors.cors, rateLimit, authenticate.verifyFlexible, (req, res, next)=>{
  COMPANYREV.findOneAndUpdate({_id: req.params.revId, hidden: false}, {$inc: {views: 1}})
  .populate("user", {name: 1, picture: 1})
  .populate("company", {name: 1})
  .then(async (rev)=>{
    if(!rev){
      return res.status(404).json({
        success: false,
        status: "not found"
      });
    }
    
    try{
      await USER.findByIdAndUpdate(rev.user._id, {$inc: {totalViews: 1}});
    }
    catch(err){
      console.log("Error from GET /reviews/phone/:revId WHILE INCREASING THE TOTAL VIEWS COUNT OF A REVIEW AUTHOR: ", err);
    }

    let resultRev = {
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
      liked: false,
      verificationRatio: rev.verificationRatio
    };

    // request is done by a user
    if(req.user){
      // check the liked state
      let like;
      try{
        like = await COMPANY_REVS_LIKES.findOne({user: req.user._id, review: rev._id, unliked: false});
      }
      catch(err){
        console.log("Error from /reviews/phone/:revId: ", err);
        return res.status(500).json({
          success: false,
          status: "internal server error",
          err: "Finding the liked state failed"
        });
      }
      if(like){
        resultRev.liked = true;
      }
    }

    res.status(200).json({
      success: true,
      review: resultRev
    });

  })
  .catch((err)=>{
    console.log("Error from GET /reviews/company/:revId: ", err);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: "Finding the company review failed"
    });
  });
});




// get my phone reviews
reviewRouter.get("/phone/by/me", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
  
  let itemsPerRound = parseInt((process.env.MY_PHONE_REVS_PER_ROUND|| config.MY_PHONE_REVS_PER_ROUND));
  let roundNum = req.query.round;
  if(!roundNum || isNaN(roundNum)){
      return res.status(400).json({
        success: false,
        status: "bad request",
      });
  }

  PHONEREV.find({user: req.user._id, hidden: false})
  .sort({likes: -1, createdAt: -1})
  .skip((roundNum - 1) * itemsPerRound)
  .limit(itemsPerRound)
  .populate("phone", {name: 1})
  .then(async (revs)=>{
    if(revs.length === 0){
      return res.status(200).json({
        success: true,
        reviews: []
      });
    }

    let resultRevs = [];
    let idsList = [];
    let ids = {};

    // preparing reviews
    for (let[index, rev] of revs.entries()){
      // array of ids to access the likes collection
      idsList.push(rev._id);
      // object of reviews indexed by id to optimize giving the likes
      ids[rev._id] = index;
      // array of reviews
      resultRevs.push({
        _id: rev._id,
        type: "phone",
        targetId: rev.phone._id,
        targetName: rev.phone.name,
        userId: req.user._id,
        userName: req.user.name,
        picture: req.user.picture,
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
        liked: false,
        verificationRatio: rev.verificationRatio
      });
    }

    // checking liked state
    // let likes;
    // try{
    //   likes = await PHONE_REVS_LIKES.find({user: req.user._id, review: {$in: idsList}, unliked: false});
    // }
    // catch(err){
    //   console.log("Error from /reviews/phone/by/me: ", err);
    //   return res.status(500).json({
    //     success: false,
    //     status: "internal server error",
    //     err: "Finding the liked state failed"
    //   });
    // }
    // for(let like of likes){
    //   resultRevs[ids[like.review]].liked = true;
    // }

    res.status(200).json({
      success: true,
      reviews: resultRevs
    });

  })
  .catch((err)=>{
    console.log("Error from GET /reviews/phone/by/me: ", err);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: "Finding my phone reviews failed"
    });
  });
});





// get phone reviews of another user
reviewRouter.get("/phone/by/:userId", cors.cors, rateLimit, authenticate.verifyFlexible, (req, res, next)=>{
  
  let itemsPerRound = parseInt((process.env.ANOTHER_USER_PHONE_REVS_PER_ROUND|| config.ANOTHER_USER_PHONE_REVS_PER_ROUND));
  let roundNum = req.query.round;
  if(!roundNum || isNaN(roundNum)){
      return res.status(400).json({
        success: false,
        status: "bad request",
      });
  }

  PHONEREV.find({user: req.params.userId, hidden: false})
  .sort({likes: -1, createdAt: -1})
  .skip((roundNum - 1) * itemsPerRound)
  .limit(itemsPerRound)
  .populate("user", {name: 1, picture: 1})
  .populate("phone", {name: 1})
  .then(async (revs)=>{
    if(revs.length === 0){
      return res.status(200).json({
        success: true,
        reviews: []
      });
    }

    let resultRevs = [];
    let idsList = [];
    let ids = {};

    // preparing reviews
    for (let[index, rev] of revs.entries()){
      // array of ids to access the likes collection
      idsList.push(rev._id);
      // object of reviews indexed by id to optimize giving the likes
      ids[rev._id] = index;
      // array of reviews
      resultRevs.push({
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
        liked: false,
        verificationRatio: rev.verificationRatio
      });
    }

    if(req.user){
      // checking liked state
      let likes;
      try{
        likes = await PHONE_REVS_LIKES.find({user: req.user._id, review: {$in: idsList}, unliked: false});
      }
      catch(err){
        console.log("Error from /reviews/phone/by/me: ", err);
        return res.status(500).json({
          success: false,
          status: "internal server error",
          err: "Finding the liked state failed"
        });
      }
      for(let like of likes){
        resultRevs[ids[like.review]].liked = true;
      }
    }

    res.status(200).json({
      success: true,
      reviews: resultRevs
    });

  })
  .catch((err)=>{
    console.log("Error from GET /reviews/phone/by/:userId: ", err);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: "Finding the phone reviews for another user failed"
    });
  });
});






// get my company reviews
reviewRouter.get("/company/by/me", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
  
  let itemsPerRound = parseInt((process.env.MY_COMPANY_REVS_PER_ROUND|| config.MY_COMPANY_REVS_PER_ROUND));
  let roundNum = req.query.round;
  if(!roundNum || isNaN(roundNum)){
      return res.status(400).json({
        success: false,
        status: "bad request",
      });
  }

  COMPANYREV.find({user: req.user._id, hidden: false})
  .sort({likes: -1, createdAt: -1})
  .skip((roundNum - 1) * itemsPerRound)
  .limit(itemsPerRound)
  .populate("company", {name: 1})
  .then(async (revs)=>{
    if(revs.length === 0){
      return res.status(200).json({
        success: true,
        reviews: []
      });
    }

    let resultRevs = [];
    let idsList = [];
    let ids = {};

    // preparing reviews
    for (let[index, rev] of revs.entries()){
      // array of ids to access the likes collection
      idsList.push(rev._id);
      // object of reviews indexed by id to optimize giving the likes
      ids[rev._id] = index;
      // array of reviews
      resultRevs.push({
        _id: rev._id,
        type: "company",
        targetId: rev.company._id,
        targetName: rev.company.name,
        userId: req.user._id,
        userName: req.user.name,
        picture: req.user.picture,
        createdAt: rev.createdAt,
        views: rev.views,
        likes: rev.likes,
        commentsCount: rev.commentsCount,
        shares: rev.shares,
        corresPhoneRev: rev.corresPrev,
        generalRating: rev.generalRating,
        pros: rev.pros,
        cons: rev.cons,
        liked: false,
        verificationRatio: rev.verificationRatio
      });
    }

    // // checking liked 
    // let likes;
    // try{
    //   likes = await COMPANY_REVS_LIKES.find({user: req.user._id, review: {$in: idsList}, unliked: false});
    // }
    // catch(err){
    //   console.log("Error from /reviews/company/by/me: ", err);
    //   return res.status(500).json({
    //     success: false,
    //     status: "internal server error",
    //     err: "Finding the liked state failed"
    //   });
    // }
    // for(let like of likes){
    //   resultRevs[ids[like.review]].liked = true;
    // }

    res.status(200).json({
      success: true,
      reviews: resultRevs
    });

  })
  .catch((err)=>{
    console.log("Error from GET /reviews/company/by/me: ", err);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: "Finding my company reviews failed"
    });
  });
});





// get company reviews of another user
reviewRouter.get("/company/by/:userId", cors.cors, rateLimit, authenticate.verifyFlexible, (req, res, next)=>{
  
  let itemsPerRound = parseInt((process.env.ANOTHER_USER_COMPANY_REVS_PER_ROUND|| config.ANOTHER_USER_COMPANY_REVS_PER_ROUND));
  let roundNum = req.query.round;
  if(!roundNum || isNaN(roundNum)){
      return res.status(400).json({
        success: false,
        status: "bad request",
      });
  }

  COMPANYREV.find({user: req.params.userId, hidden: false})
  .sort({likes: -1, createdAt: -1})
  .skip((roundNum - 1) * itemsPerRound)
  .limit(itemsPerRound)
  .populate("user", {name: 1, picture: 1})
  .populate("company", {name: 1})
  .then(async (revs)=>{
    if(revs.length === 0){
      return res.status(200).json({
        success: true,
        reviews: []
      });
    }

    let resultRevs = [];
    let idsList = [];
    let ids = {};

    // preparing reviews
    for (let[index, rev] of revs.entries()){
      // array of ids to access the likes collection
      idsList.push(rev._id);
      // object of reviews indexed by id to optimize giving the likes
      ids[rev._id] = index;
      // array of reviews
      resultRevs.push({
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
        liked: false,
        verificationRatio: rev.verificationRatio
      });
    }

    if(req.user){
      // checking liked state
      let likes;
      try{
        likes = await COMPANY_REVS_LIKES.find({user: req.user._id, review: {$in: idsList}, unliked: false});
      }
      catch(err){
        console.log("Error from /reviews/company/by/:userId: ", err);
        return res.status(500).json({
          success: false,
          status: "internal server error",
          err: "Finding the liked state failed"
        });
      }
      for(let like of likes){
        resultRevs[ids[like.review]].liked = true;
      }
    }

    res.status(200).json({
      success: true,
      reviews: resultRevs
    });

  })
  .catch((err)=>{
    console.log("Error from GET /reviews/company/by/:userId: ", err);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: "Finding the company reviews for another user failed"
    });
  });
});




// Get reviews on a certain phone
reviewRouter.get("/phone/on/:phoneId", cors.cors, rateLimit, authenticate.verifyFlexible, (req, res, next)=>{
  
  let itemsPerRound = parseInt((process.env.PHONE_REVS_PER_ROUND|| config.PHONE_REVS_PER_ROUND));
  let roundNum = req.query.round;
  if(!roundNum || isNaN(roundNum)){
      return res.status(400).json({
        success: false,
        status: "bad request",
      });
  }

  PHONEREV.find({phone: req.params.phoneId, hidden: false})
  .sort({likes: -1, createdAt: -1})
  .skip((roundNum - 1) * itemsPerRound)
  .limit(itemsPerRound)
  .populate("user", {name: 1, picture: 1})
  .populate("phone", {name: 1})
  .then(async (revs)=>{
    if(revs.length === 0){
      return res.status(200).json({
        success: true,
        reviews: []
      });
    }

    let resultRevs = [];
    let idsList = [];
    let ids = {};

    // preparing reviews
    for (let[index, rev] of revs.entries()){
      // array of ids to access the likes collection
      idsList.push(rev._id);
      // object of reviews indexed by id to optimize giving the likes
      ids[rev._id] = index;
      // array of reviews
      resultRevs.push({
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
        liked: false,
        verificationRatio: rev.verificationRatio
      });
    }

    if(req.user){
      // checking liked state
      let likes;
      try{
        likes = await PHONE_REVS_LIKES.find({user: req.user._id, review: {$in: idsList}, unliked: false});
      }
      catch(err){
        console.log("Error from /reviews/phone/on/:phoneId: ", err);
        return res.status(500).json({
          success: false,
          status: "internal server error",
          err: "Finding the liked state failed"
        });
      }
      for(let like of likes){
        resultRevs[ids[like.review]].liked = true;
      }
    }


    res.status(200).json({
      success: true,
      reviews: resultRevs
    });

  })
  .catch((err)=>{
    console.log("Error from GET /reviews/phone/on/:phoneId: ", err);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: "Finding reviews on a certain phone failed"
    });
  });
});





// Get reviews on a certain company
reviewRouter.get("/company/on/:companyId", cors.cors, rateLimit, authenticate.verifyFlexible, (req, res, next)=>{
  
  let itemsPerRound = parseInt((process.env.COMPANY_REVS_PER_ROUND|| config.COMPANY_REVS_PER_ROUND));
  let roundNum = req.query.round;
  if(!roundNum || isNaN(roundNum)){
      return res.status(400).json({
        success: false,
        status: "bad request",
      });
  }

  COMPANYREV.find({company: req.params.companyId, hidden: false})
  .sort({likes: -1, createdAt: -1})
  .skip((roundNum - 1) * itemsPerRound)
  .limit(itemsPerRound)
  .populate("user", {name: 1, picture: 1})
  .populate("company", {name: 1})
  .then(async (revs)=>{
    if(revs.length === 0){
      return res.status(200).json({
        success: true,
        reviews: []
      });
    }

    let resultRevs = [];
    let idsList = [];
    let ids = {};

    // preparing reviews
    for (let[index, rev] of revs.entries()){
      // array of ids to access the likes collection
      idsList.push(rev._id);
      // object of reviews indexed by id to optimize giving the likes
      ids[rev._id] = index;
      // array of reviews
      resultRevs.push({
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
        liked: false,
        verificationRatio: rev.verificationRatio
      });
    }

    if(req.user){
      // checking liked state
      let likes;
      try{
        likes = await COMPANY_REVS_LIKES.find({user: req.user._id, review: {$in: idsList}, unliked: false});
      }
      catch(err){
        console.log("Error from /reviews/company/on/:companyId: ", err);
        return res.status(500).json({
          success: false,
          status: "internal server error",
          err: "Finding the liked state failed"
        });
      }
      for(let like of likes){
        resultRevs[ids[like.review]].liked = true;
      }
    }


    res.status(200).json({
      success: true,
      reviews: resultRevs
    });

  })
  .catch((err)=>{
    console.log("Error from GET /reviews/company/on/:companyId: ", err);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: "Finding reviews on a certain company failed"
    });
  });
});







// likes and unlikes
/*
  Initially, the user didn't like the review before.
    1- the user likes the review ---> a new like document is created
    2- the user unlikes the review ---> the like document is updated
    3- the user likes the review again ---> the like document is updated
    4- the user unlikes the review again ---> an error is returned
  After one day
    1- the user unlikes the review ---> the like document is updated and a new unlike document is created
    2- the user likes the review ---> the like document is updated and the unlike document is deleted
    3- the user unlikes the review ---> the like document is updated and the unlike document is created
  After one day
    1- the user likes the review ---> the like document is updated
    2- the user unlikes the review ---> the like document is updated and a new unlike document is created
    3- the user likes the review ---> the like document is updated and the unlike document is deleted
*/


// like a phone review
/*
  steps:
    1- check if the user already liked the review
    2- if the user already liked the review, return an error
    3- if the user has liked the review any time in the past:
      3.1- check if the unliked state of the like document is false, if it is true, return error
      3.2- check if the review in not made by the user
      3.3- increase the number of likes by 1 for that review
      3.4- get the date of the latest query
      3.5- if the updatedAt for the like document is older than or equal to the date of the latest query, delete any unlike document for this user on this review later than the date of the latest query
      3.6- modify the unliked state of the like document to false indicating that the user has liked the review
      3.7- give points to the review author
    4- if the user didn't like the review before:
      4.1- check if the review in not made by the user
      4.2- increase the number of likes by 1 for that review
      4.3- create a new like document
      4.4- give points to the review author
*/
reviewRouter.post("/phone/:revId/like", cors.cors, rateLimit, authenticate.verifyUser, async(req, res, next)=>{

  // checking if the user already liked the review
  // check if there is a currently running competition or not
  let isCompetition = false;
  try{
    isCompetition = await isThereAcompetition();
  }
  catch(result){
    isCompetition = result;
  }
  PHONE_REVS_LIKES.findOne({user: req.user._id, review: req.params.revId}).then((like)=>{
    if(like){
      if(like.unliked == false){
        return res.status(403).json({
          success: false,
          status: "already liked"
        });
      }

      let proms1 = [];
      // increasing number of likes for the review - getting the date of the last query
      proms1.push(PHONEREV.findOne({_id: req.params.revId, hidden: false}));
      proms1.push(CONSTANT.findOne({name: "AILastQuery"}, {date: 1, _id: 0}));
      Promise.all(proms1).then((results)=>{
        let rev = results[0];
        let lastQueryDoc = results[1];
        let lastQuery;

        if(!rev){
          return res.status(404).json({
            success: false,
            status: "not found"
          });
        }

        if(rev.user.equals(req.user._id)){
          return res.status(403).json({
            success: false,
            status: "owned"
          });
        }

        rev.likes = rev.likes + 1;

        if(!lastQueryDoc){
          lastQuery = new Date((process.env.AI_LAST_QUERY_DEFAULT || config.AI_LAST_QUERY_DEFAULT));
        }
        else{
          lastQuery = lastQueryDoc.date;
        }

        let proms2 = [];
        proms2.push(rev.save());
        // if the updatedAt of the like document is newer than the last query, delete the unlike document that is created later than the date of the last query
        if(like.updatedAt >= lastQuery){
          proms2.push(PHONE_REVS_UNLIKES.findOneAndRemove({user: req.user._id, review: req.params.revId, createdAt: {$gte: lastQuery}}));
        }
        // updating the like document to have the unliked = false
        proms2.push(PHONE_REVS_LIKES.findByIdAndUpdate(like._id, {$set: {unliked: false}}));
        // giving points to the user
        proms2.push(USER.findOneAndUpdate({_id: rev.user}, {$inc: {comPoints: (isCompetition)?parseInt((process.env.REV_LIKE_POINTS|| config.REV_LIKE_POINTS)):0, absPoints: parseInt((process.env.REV_LIKE_POINTS|| config.REV_LIKE_POINTS))}}));
        Promise.all(proms2).then((result2)=>{
          return res.status(200).json({
            success: true
          });
        })
        .catch((err)=>{
          console.log("Error from /review/phone/:revId/like: ", err);
          return res.status(500).json({
            success: false,
            status: "internal server error",
            err: "Updating the like or giving points to user failed"
          });
        });

      })
      .catch((err)=>{
        console.log("Error from /phone/:revId/like: ", err);
        return res.status(500).json({
          success: false,
          status: "internal server error",
          err: "Updating the review or acquiring the date of last query failed"
        });
      });
    }
    else{
      // creating the like
      // create the like document - give points to the review author
      PHONEREV.findOne({_id: req.params.revId, hidden: false})
      .then(async(rev)=>{
        if(!rev){
          return res.status(404).json({
            success: false,
            status: "not found"
          });
        }

        if(rev.user.equals(req.user._id)){
          return res.status(403).json({
            success: false,
            status: "owned"
          });
        }

        rev.likes = rev.likes + 1;

        let proms = [];
        proms.push(rev.save());
        proms.push(PHONE_REVS_LIKES.create({user: req.user._id, review: req.params.revId}));
        proms.push(USER.findOneAndUpdate({_id: rev.user}, {$inc: {comPoints: (isCompetition)?parseInt((process.env.REV_LIKE_POINTS|| config.REV_LIKE_POINTS)):0, absPoints: parseInt((process.env.REV_LIKE_POINTS|| config.REV_LIKE_POINTS))}}))
        
        Promise.all(proms).then((result3)=>{
          return res.status(200).json({
            success: true
          });
        })
        .catch((err)=>{
          console.log("Error from POST /reviews/phone/:revId/like: ", err);
          return res.status(500).json({
            success: false,
            status: "internal server error",
            err: "Giving points to the review author or creating the like document failed"
          });
        });
      })
      .catch((err)=>{
        console.log("Error from /phone/:revId/like: ", err);
        return res.status(500).json({
          success: false,
          status: "internal server error",
          err: "Updating the review failed"
        });
      });
    }
  })
  .catch((err)=>{
    console.log("Error from POST /reviews/phone/:revId/like: ", err);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: "Finding the like failed"
    });
  });
});


// unlike a phone review
/* 
  steps:
    1- get the review
    2- check if the review exists and is not made by the user
    3- check if the likes count for the review is greater than 0
    4- get the like document for this user on this review
    5- if the like document doesn't exist, return an error indicating that the user didn't like the review before
    6- if the like document exists:
      6.1- if the unliked state is true, return an error indicating that the user has already unliked the review
      6.2- get the date of the last query
      6.3- decrease the number of likes for this review by 1
      6.4- check if the review exists and is not made by the user
      6.5- check if the likes count for the review is greater than or equals to 0. if this is not fulfilled, increase the likes count for the review by 1, then return an error indicating that there are no likes for the review
      6.6- if((like.createdAt < lastQuery && like.updatedAt < lastQuery) || 
        (like.updatedAt > lastQuery && like.createdAt < lastQuery)) {create a new unlike document}
      6.7- modify the like document to have the unliked = true
      6.8- remove points from the user
*/
reviewRouter.post("/phone/:revId/unlike", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
  let proms = [];
  proms.push(PHONE_REVS_LIKES.findOne({user: req.user._id, review: req.params.revId}));
  proms.push(PHONEREV.findOne({_id: req.params.revId, hidden: false}));
  
  Promise.all(proms).then((firstResults)=>{
    let like = firstResults[0];
    let rev = firstResults[1];

    if(!rev){
      return res.status(404).json({
        success: false,
        status: "not found"
      });
    }
    
    if(rev.user.equals(req.user._id)){
      return res.status(403).json({
        success: false,
        status: "owned"
      });
    }

    if(rev.likes <= 0){
      return res.status(403).json({
        success: false,
        status: "no likes"
      });
    }

    if(like){
      if(like.unliked == true){
        return res.status(403).json({
          success: false,
          status: "already unliked"
        });
      }

      let proms1 = [];
      // decreasing number of likes for the review - getting the date of the last query
      proms1.push(PHONEREV.findOneAndUpdate({_id: req.params.revId}, {$inc: {likes: -1}}, {new: true}));
      proms1.push(CONSTANT.findOne({name: "AILastQuery"}, {date: 1, _id: 0}));
      
      Promise.all(proms1).then(async(results)=>{
        let rev = results[0];
        let lastQueryDoc = results[1];
        let lastQuery;

        if(!rev){
          return res.status(404).json({
            success: false,
            status: "not found"
          });
        }

        if(rev.user.equals(req.user._id)){
          return res.status(403).json({
            success: false,
            status: "owned"
          });
        }

        if(rev.likes < 0){
          try{
            await PHONEREV.findOneAndUpdate({_id: req.params.revId}, {$inc: {likes: 1}});
            return res.status(403).json({
              success: false,
              status: "no likes"
            });
          }
          catch(err){
            console.log("Error from /review/phone/:revId/unlike: ", err);
            return res.status(500).json({
              success: false,
              status: "internal server error",
              err: "reverting number of likes for the review failed"
            });
          }
        }

        if(!lastQueryDoc){
          lastQuery = new Date((process.env.AI_LAST_QUERY_DEFAULT || config.AI_LAST_QUERY_DEFAULT));
        }
        else{
          lastQuery = lastQueryDoc.date;
        }

        // check if there is a currently running competition or not
        let isCompetition = false;
        try{
          isCompetition = await isThereAcompetition();
        }
        catch(result){
          isCompetition = result;
        }

        let proms = [];
        // modify the like to be unliked - remove points from the review author - create an unlike document
        if((like.createdAt < lastQuery && like.updatedAt < lastQuery) || 
        (like.updatedAt > lastQuery && like.createdAt < lastQuery)){
          proms.push(PHONE_REVS_UNLIKES.create({user: req.user._id, review: req.params.revId}));
        }
        proms.push(PHONE_REVS_LIKES.findByIdAndUpdate(like._id, {$set: {unliked: true}}));
        proms.push(USER.findOneAndUpdate({_id: rev.user}, {$inc: {comPoints: (isCompetition)?-parseInt((process.env.REV_LIKE_POINTS|| config.REV_LIKE_POINTS)):0, absPoints: -parseInt((process.env.REV_LIKE_POINTS|| config.REV_LIKE_POINTS))}}));
      
        Promise.all(proms).then((result)=>{
          return res.status(200).json({
            success: true
          });
        })
        .catch((err)=>{
          console.log("Error from /review/phone/:revId/unlike: ", err);
          return res.status(500).json({
            success: false,
            status: "internal server error",
            err: "Updating the like or giving points to user failed or creating the unlike document failed"
          });
        });
      })
      .catch((err)=>{
        console.log("Error from /review/phone/:revId/unlike: ", err);
        return res.status(500).json({
          success: false,
          status: "internal server error",
          err: "Updating the review or acquiring the date of last query failed"
        });
      });
    }
    else{
      return res.status(403).json({
        success: false,
        status: "you didn't like this review"
      });
    }
  })
  .catch((err)=>{
    console.log("Error from POST /reviews/phone/:revId/unlike: ", err);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: "Finding the like or the review failed"
    });
  });
});





// like a company review
/*
  steps:
    1- check if the user already liked the review
    2- if the user already liked the review, return an error
    3- if the user has liked the review any time in the past:
      3.1- check if the unliked state of the like document is false, if it is true, return error
      3.2- check if the review in not made by the user
      3.3- increase the number of likes by 1 for that review
      3.4- get the date of the latest query
      3.5- if the updatedAt for the like document is older than or equal to the date of the latest query, delete any unlike document for this user on this review later than the date of the latest query
      3.6- modify the unliked state of the like document to false indicating that the user has liked the review
      3.7- give points to the review author
    4- if the user didn't like the review before:
      4.1- check if the review in not made by the user
      4.2- increase the number of likes by 1 for that review
      4.3- create a new like document
      4.4- give points to the review author
*/
reviewRouter.post("/company/:revId/like", cors.cors, rateLimit, authenticate.verifyUser, async(req, res, next)=>{
  // check if there is a currently running competition or not
  let isCompetition = false;
  try{
    isCompetition = await isThereAcompetition();
  }
  catch(result){
    isCompetition = result;
  }
  // checking if the user already liked the review
  COMPANY_REVS_LIKES.findOne({user: req.user._id, review: req.params.revId}).then((like)=>{
    if(like){
      if(like.unliked == false){
        return res.status(403).json({
          success: false,
          status: "already liked"
        });
      }

      let proms1 = [];
      // increasing number of likes for the review - getting the date of the last query
      proms1.push(COMPANYREV.findOne({_id: req.params.revId, hidden: false}));
      proms1.push(CONSTANT.findOne({name: "AILastQuery"}, {date: 1, _id: 0}));
      Promise.all(proms1).then((results)=>{
        let rev = results[0];
        let lastQueryDoc = results[1];
        let lastQuery;

        if(!rev){
          return res.status(404).json({
            success: false,
            status: "not found"
          });
        }

        if(rev.user.equals(req.user._id)){
          return res.status(403).json({
            success: false,
            status: "owned"
          });
        }

        if(!lastQueryDoc){
          lastQuery = new Date((process.env.AI_LAST_QUERY_DEFAULT || config.AI_LAST_QUERY_DEFAULT));
        }
        else{
          lastQuery = lastQueryDoc.date;
        }

        rev.likes = rev.likes + 1;

        let proms2 = [];
        proms2.push(rev.save());
        // if the updatedAt of the like document is newer than the last query, delete the unlike document that is created later than the date of the last query
        if(like.updatedAt >= lastQuery){
          proms2.push(COMPANY_REVS_UNLIKES.findOneAndRemove({user: req.user._id, review: req.params.revId, createdAt: {$gte: lastQuery}}));
        }
        // updating the like document to have the unliked = false
        proms2.push(COMPANY_REVS_LIKES.findByIdAndUpdate(like._id, {$set: {unliked: false}}));
        // giving points to the user
        proms2.push(USER.findOneAndUpdate({_id: rev.user}, {$inc: {comPoints: (isCompetition)?parseInt((process.env.REV_LIKE_POINTS|| config.REV_LIKE_POINTS)):0, absPoints: parseInt((process.env.REV_LIKE_POINTS|| config.REV_LIKE_POINTS))}}));
        Promise.all(proms2).then((result2)=>{
          return res.status(200).json({
            success: true
          });
        })
        .catch((err)=>{
          console.log("Error from /review/company/:revId/like: ", err);
          return res.status(500).json({
            success: false,
            status: "internal server error",
            err: "Updating the like or giving points to user failed"
          });
        });

      })
      .catch((err)=>{
        console.log("Error from /company/:revId/like: ", err);
        return res.status(500).json({
          success: false,
          status: "internal server error",
          err: "Updating the review or acquiring the date of last query failed"
        });
      });
    }
    else{
      // creating the like
      // create the like document - give points to the review author
      COMPANYREV.findOne({_id: req.params.revId, hidden: false})
      .then((rev)=>{
        if(!rev){
          return res.status(404).json({
            success: false,
            status: "not found"
          });
        }

        if(rev.user.equals(req.user._id)){
          return res.status(403).json({
            success: false,
            status: "owned"
          });
        }

        rev.likes = rev.likes + 1;

        let proms = [];
        proms.push(rev.save());
        proms.push(COMPANY_REVS_LIKES.create({user: req.user._id, review: req.params.revId}));
        proms.push(USER.findOneAndUpdate({_id: rev.user}, {$inc: {comPoints: (isCompetition)?parseInt((process.env.REV_LIKE_POINTS|| config.REV_LIKE_POINTS)):0, absPoints: parseInt((process.env.REV_LIKE_POINTS|| config.REV_LIKE_POINTS))}}))
        
        Promise.all(proms).then((result3)=>{
          return res.status(200).json({
            success: true
          });
        })
        .catch((err)=>{
          console.log("Error from POST /reviews/company/:revId/like: ", err);
          return res.status(500).json({
            success: false,
            status: "internal server error",
            err: "Giving points to the review author or creating the like document failed"
          });
        });
      })
      .catch((err)=>{
        console.log("Error from /company/:revId/like: ", err);
        return res.status(500).json({
          success: false,
          status: "internal server error",
          err: "Updating the review failed"
        });
      });
    }
  })
  .catch((err)=>{
    console.log("Error from POST /reviews/company/:revId/like: ", err);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: "Finding the like failed"
    });
  });
});


// unlike a company review
/* 
  steps:
    1- get the review
    2- check if the review exists and is not made by the user
    3- check if the likes count for the review is greater than 0
    4- get the like document for this user on this review
    5- if the like document doesn't exist, return an error indicating that the user didn't like the review before
    6- if the like document exists:
      6.1- if the unliked state is true, return an error indicating that the user has already unliked the review
      6.2- get the date of the last query
      6.3- decrease the number of likes for this review by 1
      6.4- check if the review exists and is not made by the user
      6.5- check if the likes count for the review is greater than or equals to 0. if this is not fulfilled, increase the likes count for the review by 1, then return an error indicating that there are no likes for the review
      6.6- if((like.createdAt < lastQuery && like.updatedAt < lastQuery) || 
        (like.updatedAt > lastQuery && like.createdAt < lastQuery)) {create a new unlike document}
      6.7- modify the like document to have the unliked = true
      6.8- remove points from the user
*/
reviewRouter.post("/company/:revId/unlike", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
  let proms = [];
  proms.push(COMPANY_REVS_LIKES.findOne({user: req.user._id, review: req.params.revId}));
  proms.push(COMPANYREV.findOne({_id: req.params.revId, hidden: false}));
  
  Promise.all(proms).then((firstResults)=>{
    let like = firstResults[0];
    let rev = firstResults[1];

    if(!rev){
      return res.status(404).json({
        success: false,
        status: "not found"
      });
    }

    if(rev.user.equals(req.user._id)){
      return res.status(403).json({
        success: false,
        status: "owned"
      });
    }
    
    if(rev.likes <= 0){
      return res.status(403).json({
        success: false,
        status: "no likes"
      });
    }

    if(like){
      if(like.unliked == true){
        return res.status(403).json({
          success: false,
          status: "already unliked"
        });
      }

      let proms1 = [];
      // decreasing number of likes for the review - getting the date of the last query
      proms1.push(COMPANYREV.findOneAndUpdate({_id: req.params.revId}, {$inc: {likes: -1}}, {new: true}));
      proms1.push(CONSTANT.findOne({name: "AILastQuery"}, {date: 1, _id: 0}));
      
      Promise.all(proms1).then(async(results)=>{
        let rev = results[0];
        let lastQueryDoc = results[1];
        let lastQuery;

        if(!rev){
          return res.status(404).json({
            success: false,
            status: "not found"
          });
        }

        if(rev.user.equals(req.user._id)){
          return res.status(403).json({
            success: false,
            status: "owned"
          });
        }

        if(rev.likes < 0){
          try{
            await COMPANYREV.findOneAndUpdate({_id: req.params.revId}, {$inc: {likes: 1}});
            return res.status(403).json({
              success: false,
              status: "no likes"
            });
          }
          catch(err){
            console.log("Error from /review/company/:revId/unlike: ", err);
            return res.status(500).json({
              success: false,
              status: "internal server error",
              err: "reverting number of likes for the review failed"
            });
          }
        }

        if(!lastQueryDoc){
          lastQuery = new Date((process.env.AI_LAST_QUERY_DEFAULT || config.AI_LAST_QUERY_DEFAULT));
        }
        else{
          lastQuery = lastQueryDoc.date;
        }

        // check if there is a currently running competition or not
        let isCompetition = false;
        try{
          isCompetition = await isThereAcompetition();
        }
        catch(result){
          isCompetition = result;
        }

        let proms = [];
        // modify the like to be unliked - remove points from the review author - create an unlike document
        if((like.createdAt < lastQuery && like.updatedAt < lastQuery) || 
        (like.updatedAt > lastQuery && like.createdAt < lastQuery)){
          proms.push(COMPANY_REVS_UNLIKES.create({user: req.user._id, review: req.params.revId}));
        }
        proms.push(COMPANY_REVS_LIKES.findByIdAndUpdate(like._id, {$set: {unliked: true}}));
        proms.push(USER.findOneAndUpdate({_id: rev.user}, {$inc: {comPoints: (isCompetition)?-parseInt((process.env.REV_LIKE_POINTS|| config.REV_LIKE_POINTS)):0, absPoints: -parseInt((process.env.REV_LIKE_POINTS|| config.REV_LIKE_POINTS))}}));
      
        Promise.all(proms).then((result)=>{
          return res.status(200).json({
            success: true
          });
        })
        .catch((err)=>{
          console.log("Error from /review/company/:revId/unlike: ", err);
          return res.status(500).json({
            success: false,
            status: "internal server error",
            err: "Updating the like or giving points to user failed or creating the unlike document failed"
          });
        });
      })
      .catch((err)=>{
        console.log("Error from /review/company/:revId/unlike: ", err);
        return res.status(500).json({
          success: false,
          status: "internal server error",
          err: "Updating the review or acquiring the date of last query failed"
        });
      });
    }
    else{
      return res.status(403).json({
        success: false,
        status: "you didn't like this review"
      });
    }
  })
  .catch((err)=>{
    console.log("Error from POST /reviews/company/:revId/unlike: ", err);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: "Finding the like or the review failed"
    });
  });
});




// add a comment to a phone review
reviewRouter.post("/phone/:revId/comments", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
  
  if(req.user.blockedFromComment){
    return res.status(403).json({
      success: false,
      status: "blocked"
    });
  }
  
  // extract the comment content from the request body
  let {content} = req.body;

  if(!content){
    return res.status(400).json({
      success: false,
      status: "bad request"
    });
  }

  if(typeof(content) != "string"){
    return res.status(400).json({
      success: false,
      status: "bad request"
    });
  }

  // content must not be empty or only spaces
  content = content.trim();
  if(content == ""){
    return res.status(400).json({
      success: false,
      status: "bad request"
    });
  }

  addComment(PHONEREV, req.params.revId, PHONE_REVS_COMMENTS, req.user._id, "review", "content", content, "comments")
  .then((commentId)=>{
    if(commentId == 404){
      return res.status(404).json({
        success: false,
        status: "review not found"
      });
    }
    
    return res.status(200).json({
      success: true,
      comment: commentId
    });
  })
  .catch((err)=>{
    console.log("Error from POST /reviews/phone/:revId/comments: ", err.e);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: err.message
    });
  });
});





// add a comment to a company review
reviewRouter.post("/company/:revId/comments", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
  
  if(req.user.blockedFromComment){
    return res.status(403).json({
      success: false,
      status: "blocked"
    });
  }

  // extract the comment content from the request body
  let {content} = req.body;

  if(!content){
    return res.status(400).json({
      success: false,
      status: "bad request"
    });
  }

  if(typeof(content) != "string"){
    return res.status(400).json({
      success: false,
      status: "bad request"
    });
  }

  // content must not be empty or only spaces
  content = content.trim();
  if(content == ""){
    return res.status(400).json({
      success: false,
      status: "bad request"
    });
  }

  addComment(COMPANYREV, req.params.revId, COMPANY_REVS_COMMENTS, req.user._id, "review", "content", content, "comments")
  .then((commentId)=>{
    if(commentId == 404){
      return res.status(404).json({
        success: false,
        status: "review not found"
      });
    }
    
    return res.status(200).json({
      success: true,
      comment: commentId
    });
  })
  .catch((err)=>{
    console.log("Error from POST /reviews/company/:revId/comments: ", err.e);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: err.message
    });
  });
});




// add a reply to a phone review comment
reviewRouter.post("/phone/comments/:commentId/replies", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
  
  if(req.user.blockedFromReplyComment){
    return res.status(403).json({
      success: false,
      status: "blocked"
    });
  }
  
  // extract the comment content from the request body
  let {content} = req.body;

  if(!content){
    return res.status(400).json({
      success: false,
      status: "bad request"
    });
  }

  if(typeof(content) != "string"){
    return res.status(400).json({
      success: false,
      status: "bad request"
    });
  }

  // content must not be empty or only spaces
  content = content.trim();
  if(content == ""){
    return res.status(400).json({
      success: false,
      status: "bad request"
    });
  }

  addReply(PHONE_REVS_COMMENTS, req.params.commentId, "replies", req.user._id, "content", content)
  .then((replyId)=>{
    if(replyId == 404){
      return res.status(404).json({
        success: false,
        status: "comment not found"
      });
    }

    return res.status(200).json({
      success: true,
      reply: replyId
    });
  })
  .catch((err)=>{
    console.log("Error from POST /reviews/phone/comments/:commentId/replies: ", err.e);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: err.message
    });
  });
});




// add a reply to a company review comment
reviewRouter.post("/company/comments/:commentId/replies", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
  
  if(req.user.blockedFromReplyComment){
    return res.status(403).json({
      success: false,
      status: "blocked"
    });
  }
  
  // extract the comment content from the request body
  let {content} = req.body;

  if(!content){
    return res.status(400).json({
      success: false,
      status: "bad request"
    });
  }

  if(typeof(content) != "string"){
    return res.status(400).json({
      success: false,
      status: "bad request"
    });
  }

  // content must not be empty or only spaces
  content = content.trim();
  if(content == ""){
    return res.status(400).json({
      success: false,
      status: "bad request"
    });
  }

  addReply(COMPANY_REVS_COMMENTS, req.params.commentId, "replies", req.user._id, "content", content)
  .then((replyId)=>{
    if(replyId == 404){
      return res.status(404).json({
        success: false,
        status: "comment not found"
      });
    }

    return res.status(200).json({
      success: true,
      reply: replyId
    });
  })
  .catch((err)=>{
    console.log("Error from POST /reviews/company/comments/:commentId/replies: ", err.e);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: err.message
    });
  });
});





// get comments and replies for a phone review
reviewRouter.get("/phone/:revId/comments", cors.cors, rateLimit, authenticate.verifyFlexible, (req, res, next)=>{
  let itemsPerRound = parseInt((process.env.PHONE_REV_COMMENTS_PER_ROUND || config.PHONE_REV_COMMENTS_PER_ROUND));
  let roundNum = req.query.round;

  if(roundNum == null || isNaN(roundNum)){
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.json({success: false, status: "bad request"});
      return;
  }

  PHONE_REVS_COMMENTS.find({review: req.params.revId, hidden: false})
  .sort({likes: -1, createdAt: -1})
  .skip((roundNum - 1) * itemsPerRound)
  .limit(itemsPerRound)
  .populate("user", {name: 1, picture: 1, questionsAnswered: 1})
  .populate("replies.user", {name: 1, picture: 1, questionsAnswered: 1})
  .then(async(comments)=>{
    let resultComments = [];
    let commentIds = [];
    let commentsObj = {};
    let comentRepliesIds = [];
    let commentRepliesObj = {};
    
    for(let [index,comment] of comments.entries()){
      
      commentIds.push(comment._id);
      commentsObj[comment._id] = index;

      let resultComment = {
        _id: comment._id,
        userId: comment.user._id,
        userName: comment.user.name,
        userPicture: comment.user.picture,
        userQuestionsAnswered: comment.user.questionsAnswered,
        content: comment.content,
        createdAt: comment.createdAt,
        likes: comment.likes,
        liked: false,
        replies: []
      };


      for(let i=0; i<comment.replies.length; i++){
        let reply = comment.replies[i];
        if(reply.hidden){
          continue;
        }
        comentRepliesIds.push(reply._id);
        commentRepliesObj[reply._id] = {comment: index, reply: i};
        resultComment.replies.push({
          _id: reply._id,
          userId: reply.user._id,
          userName: reply.user.name,
          userPicture: reply.user.picture,
          userQuestionsAnswered: reply.user.questionsAnswered,
          content: reply.content,
          createdAt: reply.createdAt,
          likes: reply.likes,
          liked: false
        });
      }
      resultComments.push(resultComment);
    }

    if(req.user){
      // check if the user has liked any of the comments or replies
      let commentsLikes;
      let repliesLikes;
      let proms = [];
      proms.push(PHONE_REV_REPLIES_LIKES.find({user: req.user._id, reply: {$in: comentRepliesIds}}));
      proms.push(PHONE_REV_COMMENTS_LIKES.find({user: req.user._id, comment: {$in: commentIds}}));
      try{
        let results = await Promise.all(proms);
        commentsLikes = results[1];
        repliesLikes = results[0];
      }
      catch(err){
        console.log("Error from GET /reviews/phone/:revId/comments: ", err);
        return res.status(500).json({
          success: false,
          status: "internal server error",
          err: "finding the user likes on comments failed"
        });
      }
      // liked state for comments
      for(let commentLike of commentsLikes){
        resultComments[commentsObj[commentLike.comment]].liked = true;
      }
      // liked state for replies
      for(let replyLike of repliesLikes){
        let location = commentRepliesObj[replyLike.reply];
        resultComments[location.comment].replies[location.reply].liked = true;
      }
    }

    return res.status(200).json({
      success: true,
      comments: resultComments
    });
  })
  .catch((err)=>{
    console.log("Error from GET /reviews/phone/:revId/comments: ", err);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: "Finding the phone review comments failed"
    });
  })
});






// get comments and replies for a company review
reviewRouter.get("/company/:revId/comments", cors.cors, rateLimit, authenticate.verifyFlexible, (req, res, next)=>{
  let itemsPerRound = parseInt((process.env.COMPANY_REV_COMMENTS_PER_ROUND || config.COMPANY_REV_COMMENTS_PER_ROUND));
  let roundNum = req.query.round;

  if(roundNum == null || isNaN(roundNum)){
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.json({success: false, status: "bad request"});
      return;
  }

  COMPANY_REVS_COMMENTS.find({review: req.params.revId, hidden: false})
  .sort({likes: -1, createdAt: -1})
  .skip((roundNum - 1) * itemsPerRound)
  .limit(itemsPerRound)
  .populate("user", {name: 1, picture: 1, questionsAnswered: 1})
  .populate("replies.user", {name: 1, picture: 1, questionsAnswered: 1})
  .then(async(comments)=>{
    let resultComments = [];
    let commentIds = [];
    let commentsObj = {};
    let comentRepliesIds = [];
    let commentRepliesObj = {};
    
    for(let [index,comment] of comments.entries()){
      
      commentIds.push(comment._id);
      commentsObj[comment._id] = index;

      let resultComment = {
        _id: comment._id,
        userId: comment.user._id,
        userName: comment.user.name,
        userPicture: comment.user.picture,
        userQuestionsAnswered: comment.user.questionsAnswered,
        content: comment.content,
        createdAt: comment.createdAt,
        likes: comment.likes,
        liked: false,
        replies: []
      };


      for(let i=0; i<comment.replies.length; i++){
        let reply = comment.replies[i];
        if(reply.hidden){
          continue;
        }
        comentRepliesIds.push(reply._id);
        commentRepliesObj[reply._id] = {comment: index, reply: i};
        resultComment.replies.push({
          _id: reply._id,
          userId: reply.user._id,
          userName: reply.user.name,
          userPicture: reply.user.picture,
          userQuestionsAnswered: reply.user.questionsAnswered,
          content: reply.content,
          createdAt: reply.createdAt,
          likes: reply.likes,
          liked: false
        });
      }
      resultComments.push(resultComment);
    }

    if(req.user){
      // check if the user has liked any of the comments or replies
      let commentsLikes;
      let repliesLikes;
      let proms = [];
      proms.push(COMPANY_REV_REPLIES_LIKES.find({user: req.user._id, reply: {$in: comentRepliesIds}}));
      proms.push(COMPANY_REV_COMMENTS_LIKES.find({user: req.user._id, comment: {$in: commentIds}}));
      try{
        let results = await Promise.all(proms);
        commentsLikes = results[1];
        repliesLikes = results[0];
      }
      catch(err){
        console.log("Error from GET /reviews/company/:revId/comments: ", err);
        return res.status(500).json({
          success: false,
          status: "internal server error",
          err: "finding the user likes on comments failed"
        });
      }
      // liked state for comments
      for(let commentLike of commentsLikes){
        resultComments[commentsObj[commentLike.comment]].liked = true;
      }
      // liked state for replies
      for(let replyLike of repliesLikes){
        let location = commentRepliesObj[replyLike.reply];
        resultComments[location.comment].replies[location.reply].liked = true;
      }
    }

    return res.status(200).json({
      success: true,
      comments: resultComments
    });
  })
  .catch((err)=>{
    console.log("Error from GET /reviews/company/:revId/comments: ", err);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: "Finding the company review comments failed"
    });
  })
});







// like a comment on a phone review
reviewRouter.post("/phone/comments/:commentId/like", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
  likeComment(PHONE_REVS_COMMENTS, req.user._id, req.params.commentId, PHONE_REV_COMMENTS_LIKES, "comment")
  .then((result)=>{
    if(result == 200){
      return res.status(200).json({
        success: true,
      });
    }
    else if(result == 404){
      return res.status(404).json({
        success: false,
        status: "not found"
      });
    }
    else if(result == 403){
      return res.status(403).json({
        success: false,
        status: "already liked"
      });
    }
  })
  .catch((err)=>{
    if(err == 403){
      return res.status(403).json({
        success: false,
        status: "owned"
      });
    }
    console.log("Error from POST /reviews/phone/comments/:commentId/like: ", err.e);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: err.message
    });
  });
});



// unlike a comment on a phone review
reviewRouter.post("/phone/comments/:commentId/unlike", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
  unlikeComment(PHONE_REVS_COMMENTS, PHONE_REV_COMMENTS_LIKES, req.user._id, req.params.commentId, "comment")
  .then((result)=>{
    if(result == 200){
      return res.status(200).json({
        success: true
      });
    }
    else if(result == 404){
      return res.status(404).json({
        success: false,
        status: "not found"
      });
    }
  })
  .catch((err)=>{
    console.log("Error from POST /reviews/phone/comments/:commentId/unlike: ", err.e);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: err.message
    });
  });
});





// like a comment on a company review
reviewRouter.post("/company/comments/:commentId/like", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
  likeComment(COMPANY_REVS_COMMENTS, req.user._id, req.params.commentId, COMPANY_REV_COMMENTS_LIKES, "comment")
  .then((result)=>{
    if(result == 200){
      return res.status(200).json({
        success: true,
      });
    }
    else if(result == 404){
      return res.status(404).json({
        success: false,
        status: "not found"
      });
    }
    else if(result == 403){
      return res.status(403).json({
        success: false,
        status: "already liked"
      });
    }
  })
  .catch((err)=>{
    if(err == 403){
      return res.status(403).json({
        success: false,
        status: "owned"
      });
    }
    console.log("Error from POST /reviews/company/comments/:commentId/like: ", err.e);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: err.message
    });
  });
});



// unlike a comment on a company review
reviewRouter.post("/company/comments/:commentId/unlike", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
  unlikeComment(COMPANY_REVS_COMMENTS, COMPANY_REV_COMMENTS_LIKES, req.user._id, req.params.commentId, "comment")
  .then((result)=>{
    if(result == 200){
      return res.status(200).json({
        success: true
      });
    }
    else if(result == 404){
      return res.status(404).json({
        success: false,
        status: "not found"
      });
    }
  })
  .catch((err)=>{
    console.log("Error from POST /reviews/company/comments/:commentId/unlike: ", err.e);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: err.message
    });
  });
});





// like a phone review reply
reviewRouter.post("/phone/comments/:commentId/replies/:replyId/like", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
  likeReply(PHONE_REVS_COMMENTS, req.params.commentId, "replies", req.params.replyId, req.user._id, PHONE_REV_REPLIES_LIKES, "reply")
  .then((result)=>{
    if(result == 200){
      return res.status(200).json({
        success: true,
      });
    }
    else if(result == 404){
      return res.status(404).json({
        success: false,
        status: "not found"
      });
    }
    else if(result == 403){
      return res.status(403).json({
        success: false,
        status: "already liked"
      });
    }
  })
  .catch((err)=>{
    if(err == 403){
      return res.status(403).json({
        success: false,
        status: "owned"
      });
    }
    console.log("Error from POST /reviews/phone/comments/:commentId/replies/:replyId/like: ", err.e);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: err.message
    });
  });
});



// unlike a phone review reply
reviewRouter.post("/phone/comments/:commentId/replies/:replyId/unlike", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
  unlikeReply(PHONE_REVS_COMMENTS, req.params.commentId, "replies", PHONE_REV_REPLIES_LIKES, req.user._id, req.params.replyId, "reply")
  .then((result)=>{
    if(result == 200){
      return res.status(200).json({
        success: true
      });
    }
    else if(result == 404){
      return res.status(404).json({
        success: false,
        status: "not found"
      });
    }
  })
  .catch((err)=>{
    console.log("Error from POST /reviews/phone/comments/:commentId/unlike: ", err.e);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: err.message
    });
  });
});






// like a company review reply
reviewRouter.post("/company/comments/:commentId/replies/:replyId/like", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
  likeReply(COMPANY_REVS_COMMENTS, req.params.commentId, "replies", req.params.replyId, req.user._id, COMPANY_REV_REPLIES_LIKES, "reply")
  .then((result)=>{
    if(result == 200){
      return res.status(200).json({
        success: true,
      });
    }
    else if(result == 404){
      return res.status(404).json({
        success: false,
        status: "not found"
      });
    }
    else if(result == 403){
      return res.status(403).json({
        success: false,
        status: "already liked"
      });
    }
  })
  .catch((err)=>{
    if(err == 403){
      return res.status(403).json({
        success: false,
        status: "owned"
      });
    }
    console.log("Error from POST /reviews/company/comments/:commentId/replies/:replyId/like: ", err.e);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: err.message
    });
  });
});



// unlike a company review reply
reviewRouter.post("/company/comments/:commentId/replies/:replyId/unlike", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
  unlikeReply(COMPANY_REVS_COMMENTS, req.params.commentId, "replies", COMPANY_REV_REPLIES_LIKES, req.user._id, req.params.replyId, "reply")
  .then((result)=>{
    if(result == 200){
      return res.status(200).json({
        success: true
      });
    }
    else if(result == 404){
      return res.status(404).json({
        success: false,
        status: "not found"
      });
    }
  })
  .catch((err)=>{
    console.log("Error from POST /reviews/company/comments/:commentId/unlike: ", err.e);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: err.message
    });
  });
});






// increase views count for a phone review
reviewRouter.put("/phone/:reviewId/view", cors.cors, rateLimit, (req, res, next)=>{
  increaseViews(PHONEREV, req.params.reviewId, true).then((result)=>{
    if(result == 404){
      return res.status(404).json({
        success: false,
        status: "review not found"
      });
    }
    else{
      return res.status(200).json({
        success: true
      });
    }
  })
  .catch((err)=>{
    console.log("Error from PUT /reviews/phone/:reviewId/view: ", err.e);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: err.message
    });
  });
});




// increase views count for a company review
reviewRouter.put("/company/:reviewId/view", cors.cors, rateLimit, (req, res, next)=>{
  increaseViews(COMPANYREV, req.params.reviewId, true).then((result)=>{
    if(result == 404){
      return res.status(404).json({
        success: false,
        status: "review not found"
      });
    }
    else{
      return res.status(200).json({
        success: true
      });
    }
  })
  .catch((err)=>{
    console.log("Error from PUT /reviews/company/:reviewId/view: ", err.e);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: err.message
    });
  });
});





// increase shares count for a phone review
reviewRouter.put("/phone/:reviewId/share", cors.cors, rateLimit, (req, res, next)=>{
  increaseShares(PHONEREV, req.params.reviewId).then((result)=>{
    if(result == 404){
      return res.status(404).json({
        success: false,
        status: "review not found"
      });
    }
    else{
      return res.status(200).json({
        success: true
      });
    }
  })
  .catch((err)=>{
    console.log("Error from PUT /reviews/phone/:reviewId/share: ", err.e);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: err.message
    });
  });
});




// increase shares count for a company review
reviewRouter.put("/company/:reviewId/share", cors.cors, rateLimit, (req, res, next)=>{
  increaseShares(COMPANYREV, req.params.reviewId).then((result)=>{
    if(result == 404){
      return res.status(404).json({
        success: false,
        status: "review not found"
      });
    }
    else{
      return res.status(200).json({
        success: true
      });
    }
  })
  .catch((err)=>{
    console.log("Error from PUT /reviews/company/:reviewId/share: ", err.e);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: err.message
    });
  });
});





// I don't like this for a phone review
reviewRouter.post("/phone/:revId/hate", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
  lameTrack(PHONE_REV_HATED, PHONEREV, req.params.revId, req.user._id, "review", 0).then((result)=>{
    if(result == 404){
      return res.status(404).json({
        success: false,
        status: "track review not found"
      });
    }
    else if(result == 403){
      return res.status(403).json({
        success: false,
        status: "track review owned"
      });
    }
    else{
      return res.status(200).json({
        success: true
      });
    }
  })
  .catch((err)=>{
    console.log("Error from POST /reviews/phone/:revId/hate: ", err.e);
    return res.status(500).json({
      success: false,
      status: "track internal server error",
      err: err.message
    });
  })
});




// a user presses "see more" for a phone review
reviewRouter.post("/phone/:revId/seemore", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
  lameTrack(PHONE_REV_SEE_MORE, PHONEREV, req.params.revId, req.user._id, "review").then((result)=>{
    if(result == 404){
      return res.status(404).json({
        success: false,
        status: "track review not found"
      });
    }
    else if(result == 403){
      return res.status(403).json({
        success: false,
        status: "track already seemored"
      });
    }
    else{
      return res.status(200).json({
        success: true
      });
    }
  })
  .catch((err)=>{
    console.log("Error from POST /reviews/phone/:revId/hate: ", err.e);
    return res.status(500).json({
      success: false,
      status: "track internal server error",
      err: err.message
    });
  })
});




// a user presses "fullscreen" for a phone review
reviewRouter.post("/phone/:revId/fullscreen", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
  lameTrack(PHONE_REV_FULL_SCREEN, PHONEREV, req.params.revId, req.user._id, "review").then((result)=>{
    if(result == 404){
      return res.status(404).json({
        success: false,
        status: "track review not found"
      });
    }
    else if(result == 403){
      return res.status(403).json({
        success: false,
        status: "track already fullscreened"
      });
    }
    else{
      return res.status(200).json({
        success: true
      });
    }
  })
  .catch((err)=>{
    console.log("Error from POST /reviews/phone/:revId/hate: ", err.e);
    return res.status(500).json({
      success: false,
      status: "track internal server error",
      err: err.message
    });
  })
});








// I don't like this for a company review
reviewRouter.post("/company/:revId/hate", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
  lameTrack(COMPANY_REVS_HATED, COMPANYREV, req.params.revId, req.user._id, "review", 0).then((result)=>{
    if(result == 404){
      return res.status(404).json({
        success: false,
        status: "track review not found"
      });
    }
    else if(result == 403){
      return res.status(403).json({
        success: false,
        status: "track review owned"
      });
    }
    else{
      return res.status(200).json({
        success: true
      });
    }
  })
  .catch((err)=>{
    console.log("Error from POST /reviews/company/:revId/hate: ", err.e);
    return res.status(500).json({
      success: false,
      status: "track internal server error",
      err: err.message
    });
  })
});




// a user presses "see more" for a company review
reviewRouter.post("/company/:revId/seemore", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
  lameTrack(COMPANY_REVS_SEE_MORE, COMPANYREV, req.params.revId, req.user._id, "review").then((result)=>{
    if(result == 404){
      return res.status(404).json({
        success: false,
        status: "track review not found"
      });
    }
    else if(result == 403){
      return res.status(403).json({
        success: false,
        status: "track already seemored"
      });
    }
    else{
      return res.status(200).json({
        success: true
      });
    }
  })
  .catch((err)=>{
    console.log("Error from POST /reviews/company/:revId/hate: ", err.e);
    return res.status(500).json({
      success: false,
      status: "track internal server error",
      err: err.message
    });
  })
});




// a user presses "fullscreen" for a company review
reviewRouter.post("/company/:revId/fullscreen", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
  lameTrack(COMPANY_REVS_FULL_SCREEN, COMPANYREV, req.params.revId, req.user._id, "review").then((result)=>{
    if(result == 404){
      return res.status(404).json({
        success: false,
        status: "track review not found"
      });
    }
    else if(result == 403){
      return res.status(403).json({
        success: false,
        status: "track already fullscreened"
      });
    }
    else{
      return res.status(200).json({
        success: true
      });
    }
  })
  .catch((err)=>{
    console.log("Error from POST /reviews/company/:revId/hate: ", err.e);
    return res.status(500).json({
      success: false,
      status: "track internal server error",
      err: err.message
    });
  })
});




// verify a phone review with its corresponding phone and company review
reviewRouter.put("/phone/:revId/verify", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
  let uA = req.headers['user-agent'];
  let uAObj = useragent.parse(uA);

  if(!uAObj.isMobile){
      return res.status(400).json({success: false, status: "not mobile"});
  }

  let proms1 = [];
  proms1.push(PHONEREV.findById(req.params.revId, {_id: 1, phone: 1, user: 1, verificationRatio: 1}).populate("phone", {name: 1, company: 1}));

  Promise.all(proms1)
    .then(async(results)=>{
        let rev = results[0];

        if(rev == null){
            return res.status(404).json({success: false, status: "not found"});
        }

        if(!(rev.user.equals(req.user._id))){
            return res.status(403).json({success: false, status: "not owned"});
        }

        if(rev.verificationRatio != 0){
          return res.status(403).json({success: false, status: "already verified"});
        }

        let verificationRatio = 0;

        if(uAObj.isiPhone){
            if(rev.phone.company.equals((process.env.IPHONE_COMPANY || config.IPHONE_COMPANY))){
                verificationRatio = -1;
            }
        }
        else{
            let parsedUa = useragentParser(uA);
            let modelName = parsedUa.device.model;

            if(!(modelName == null || modelName.match(/^\s*$/))){
              modelName = modelName.trim();
              let vendor = parsedUa.device.vendor;
              vendor = (vendor == null)? "": vendor.trim();
              let regex = `,(${vendor})?\\s*${modelName},`;
              let phones;
              try{
                  phones = await PHONE.find({otherNames: {$regex: regex, $options: "i"}}, {name: 1});
                  
                  if(phones.length == 0){
                      try{
                        let newPhones = await mapUaToPhones(uA, "," + modelName + ",", null, null, true);
                        phones = newPhones;
                      }
                      catch(err){
                        console.log(err);
                      }
                  }
                  
                  for(let phone of phones){
                      if(phone.name == rev.phone.name){
                          verificationRatio = (1 / phones.length) * 100;
                          break;
                        }
                  }
              }
              catch(err){
                  console.log("Error from /reviews/phone/:revId/verify: ", err);
                  return res.status(500).json({success: false, status: "error finding the matched phones"});
              }
            }
        }

        // update the verification ratio in the owned phones, phone reviews, company reviews
        let bonusVerificationPoints = 0;
        if(verificationRatio == 0){
          return res.status(200).json({success: true, verificationRatio: rev.verificationRatio});
        }
        else{
          bonusVerificationPoints = parseInt(process.env.VERIFICATION_REV_POINTS || config.VERIFICATION_REV_POINTS);
        }
        rev.verificationRatio = verificationRatio;
        let proms2 = [];
        proms2.push(rev.save());
        proms2.push(OWNED_PHONE.findOneAndUpdate({user: req.user._id, phone: rev.phone._id}, {$set: {verificationRatio: verificationRatio}}));
        proms2.push(COMPANYREV.findOneAndUpdate({corresPrev: rev._id}, {$set: {verificationRatio: verificationRatio}}));
        proms2.push(USER.findByIdAndUpdate(req.user._id, {$inc: {comPoints: bonusVerificationPoints, absPoints: bonusVerificationPoints}}));

        Promise.all(proms2)
        .then((results2)=>{
            return res.status(200).json({success: true, verificationRatio: verificationRatio});
        })
        .catch((err)=>{
            console.log("Error from /reviews/phone/:revId/verify: ", err);
            return res.status(500).json({success: false, status: "error updating the verification ratio"});
        });
    })
    .catch((err)=>{
        console.log("Error from /reviews/phone/:revId/verify: ", err);
        return res.status(500).json({success: false, status: "error finding the phone"});
    });

});



/*
  Hiding tracking algorithm:
  steps:
    1- if we want to hide, create a document holding the id of the hidden review/question and delete the unhide doc
      (the document must be unique)
    2- if we want to unhide:
      if the hide doc is created after the lastQuery date, delete the hide doc
      if the hide doc is created after the lastQuery date, delete the hide doc and create a new unhide doc
*/

// hide a phone review
reviewRouter.put("/phone/:revId/hide", cors.cors, rateLimit, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next)=>{
  PHONEREV.findByIdAndUpdate(req.params.revId, {$set: {hidden: true}})
  .then((r)=>{
    if(!r){
      return res.status(404).json({
        success: false,
        status: "not found"
      });
    }

    let proms = [];
    proms.push(PHONE_REVS_HIDDEN.findOneAndUpdate({review: req.params.revId}, {}, {upsert: true}));
    proms.push(PHONE_REVS_UNHIDDEN.findOneAndDelete({review: req.params.revId}));
    
    Promise.all(proms)
    .then((h)=>{
      return res.status(200).json({
        success: true
      });
    })
    .catch((err)=>{
      console.log("Error from /reviews/phone/:revId/hide: ", err);
      return res.status(500).json({
        success: false,
        status: "error tracking the hidden review"
      });
    });
  })
  .catch((err)=>{
    console.log("Error from /reviews/phone/:revId/hide: ", err);
    return res.status(500).json({success: false, status: "error hiding the phone review"});
  })
});


// hide a company review
reviewRouter.put("/company/:revId/hide", cors.cors, rateLimit, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next)=>{
  COMPANYREV.findByIdAndUpdate(req.params.revId, {$set: {hidden: true}})
  .then((r)=>{
    if(!r){
      return res.status(404).json({
        success: false,
        status: "not found"
      });
    }

    let proms = [];
    proms.push(COMPANY_REVS_HIDDEN.findOneAndUpdate({review: req.params.revId}, {}, {upsert: true}));
    proms.push(COMPANY_REVS_UNHIDDEN.findOneAndDelete({review: req.params.revId}));
    
    Promise.all(proms)
    .then((h)=>{
      return res.status(200).json({
        success: true
      });
    })
    .catch((err)=>{
      console.log("Error from /reviews/company/:revId/hide: ", err);
      return res.status(500).json({
        success: false,
        status: "error tracking the hidden review"
      });
    });
  })
  .catch((err)=>{
    console.log("Error from /reviews/company/:revId/hide: ", err);
    return res.status(500).json({success: false, status: "error hiding the company review"});
  })
});




// unhide a phone review
reviewRouter.put("/phone/:revId/unhide", cors.cors, rateLimit, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next)=>{
  let proms = [];
  proms.push(PHONEREV.findByIdAndUpdate(req.params.revId, {$set: {hidden: false}}))
  proms.push(CONSTANT.findOne({name: "AILastQuery"}, {date: 1, _id: 0}))
  proms.push(PHONE_REVS_HIDDEN.findOne({review: req.params.revId}, {createdAt: 1}))

  Promise.all(proms)
  .then(async(results)=>{
    let r = results[0];
    let lastQueryDoc = results[1];
    let lastQuery;

    if(!lastQueryDoc){
      lastQuery = new Date((process.env.AI_LAST_QUERY_DEFAULT || config.AI_LAST_QUERY_DEFAULT));
    }
    else{
      lastQuery = lastQueryDoc.date;
    }

    if(!r){
      return res.status(404).json({
        success: false,
        status: "not found"
      });
    }

    let hideDoc = results[2];

    if(hideDoc){
      if(hideDoc.createdAt >= lastQuery){
        try{
          await PHONE_REVS_HIDDEN.findByIdAndDelete(hideDoc._id);
        }
        catch(err){
          console.log("Error from /reviews/phone/:revId/unhide: ", err);
          return res.status(500).json({success: false, status: "error unhiding the phone review"});
        }
      }
      else{
        let proms1 = [];
        proms1.push(PHONE_REVS_HIDDEN.findByIdAndDelete(hideDoc._id));
        proms1.push(PHONE_REVS_UNHIDDEN.create({review: req.params.revId}));

        try{
          await Promise.all(proms1);
        }
        catch(err){
          console.log("Error from /reviews/phone/:revId/unhide: ", err);
          return res.status(500).json({success: false, status: "error unhiding the phone review"});
        }
      }
    }

    return res.status(200).json({
      success: true
    });
  })
  .catch((err)=>{
    console.log("Error from /reviews/phone/:revId/unhide: ", err);
    return res.status(500).json({success: false, status: "error unhiding the phone review"});
  })
});


// unhide a company review
reviewRouter.put("/company/:revId/unhide", cors.cors, rateLimit, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next)=>{
  let proms = [];
  proms.push(COMPANYREV.findByIdAndUpdate(req.params.revId, {$set: {hidden: false}}))
  proms.push(CONSTANT.findOne({name: "AILastQuery"}, {date: 1, _id: 0}))
  proms.push(COMPANY_REVS_HIDDEN.findOne({review: req.params.revId}, {createdAt: 1}))

  Promise.all(proms)
  .then(async(results)=>{
    let r = results[0];
    let lastQueryDoc = results[1];
    let lastQuery;

    if(!lastQueryDoc){
      lastQuery = new Date((process.env.AI_LAST_QUERY_DEFAULT || config.AI_LAST_QUERY_DEFAULT));
    }
    else{
      lastQuery = lastQueryDoc.date;
    }

    if(!r){
      return res.status(404).json({
        success: false,
        status: "not found"
      });
    }

    let hideDoc = results[2];

    if(hideDoc){
      if(hideDoc.createdAt >= lastQuery){
        try{
          await COMPANY_REVS_HIDDEN.findByIdAndDelete(hideDoc._id);
        }
        catch(err){
          console.log("Error from /reviews/company/:revId/unhide: ", err);
          return res.status(500).json({success: false, status: "error unhiding the company review"});
        }
      }
      else{
        let proms1 = [];
        proms1.push(COMPANY_REVS_HIDDEN.findByIdAndDelete(hideDoc._id));
        proms1.push(COMPANY_REVS_UNHIDDEN.create({review: req.params.revId}));

        try{
          await Promise.all(proms1);
        }
        catch(err){
          console.log("Error from /reviews/company/:revId/unhide: ", err);
          return res.status(500).json({success: false, status: "error unhiding the company review"});
        }
      }
    }

    return res.status(200).json({
      success: true
    });
  })
  .catch((err)=>{
    console.log("Error from /reviews/company/:revId/unhide: ", err);
    return res.status(500).json({success: false, status: "error unhiding the company review"});
  })
});





// hide a phone review comment
reviewRouter.put("/phone/comments/:commentId/hide", cors.cors, rateLimit, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next)=>{
  PHONE_REVS_COMMENTS.findByIdAndUpdate(req.params.commentId, {$set: {hidden: true}})
  .then((r)=>{
    if(!r){
      return res.status(404).json({
        success: false,
        status: "not found"
      });
    }

    // decrease the number of comments in the phone review
    let revId = r.review;
    PHONEREV.findByIdAndUpdate(revId, {$inc: {commentsCount: -1}})
    .then((rev)=>{
      if(!rev){
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
      console.log("Error from /reviews/phone/comments/:commentId/hide: ", err);
      return res.status(500).json({success: false, status: "error decreasing the number of comments in the phone review"});
    });
  })
  .catch((err)=>{
    console.log("Error from /reviews/phone/comments/:commentId/hide: ", err);
    return res.status(500).json({success: false, status: "error hiding the phone comment"});
  })
});


// hide a company review comment
reviewRouter.put("/company/comments/:commentId/hide", cors.cors, rateLimit, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next)=>{
  COMPANY_REVS_COMMENTS.findByIdAndUpdate(req.params.commentId, {$set: {hidden: true}})
  .then((r)=>{
    if(!r){
      return res.status(404).json({
        success: false,
        status: "not found"
      });
    }

    // decrease the number of comments in the phone review
    let revId = r.review;
    COMPANYREV.findByIdAndUpdate(revId, {$inc: {commentsCount: -1}})
    .then((rev)=>{
      if(!rev){
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
      console.log("Error from /reviews/company/comments/:commentId/hide: ", err);
      return res.status(500).json({success: false, status: "error decreasing the number of comments in the phone review"});
    });
  })
  .catch((err)=>{
    console.log("Error from /reviews/company/comments/:commentId/hide: ", err);
    return res.status(500).json({success: false, status: "error hiding the phone comment"});
  })
});



// unhide a phone review comment
reviewRouter.put("/phone/comments/:commentId/unhide", cors.cors, rateLimit, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next)=>{
  PHONE_REVS_COMMENTS.findByIdAndUpdate(req.params.commentId, {$set: {hidden: false}})
  .then((r)=>{
    if(!r){
      return res.status(404).json({
        success: false,
        status: "not found"
      });
    }

    // increase the number of comments in the phone review
    let revId = r.review;
    PHONEREV.findByIdAndUpdate(revId, {$inc: {commentsCount: 1}})
    .then((rev)=>{
      if(!rev){
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
      console.log("Error from /reviews/phone/comments/:commentId/unhide: ", err);
      return res.status(500).json({success: false, status: "error decreasing the number of comments in the phone review"});
    });
  })
  .catch((err)=>{
    console.log("Error from /reviews/phone/comments/:commentId/unhide: ", err);
    return res.status(500).json({success: false, status: "error unhiding the phone comment"});
  });
});


// unhide a company review comment
reviewRouter.put("/company/comments/:commentId/unhide", cors.cors, rateLimit, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next)=>{
  COMPANY_REVS_COMMENTS.findByIdAndUpdate(req.params.commentId, {$set: {hidden: false}})
  .then((r)=>{
    if(!r){
      return res.status(404).json({
        success: false,
        status: "not found"
      });
    }

    // increase the number of comments in the phone review
    let revId = r.review;
    COMPANYREV.findByIdAndUpdate(revId, {$inc: {commentsCount: 1}})
    .then((rev)=>{
      if(!rev){
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
      console.log("Error from /reviews/company/comments/:commentId/unhide: ", err);
      return res.status(500).json({success: false, status: "error decreasing the number of comments in the phone review"});
    });
  })
  .catch((err)=>{
    console.log("Error from /reviews/company/comments/:commentId/unhide: ", err);
    return res.status(500).json({success: false, status: "error unhiding the phone comment"});
  });
});





// hide a phone review reply
reviewRouter.put("/phone/comments/:commentId/replies/:replyId/hide", cors.cors, rateLimit, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next)=>{
  PHONE_REVS_COMMENTS.findOne({_id: req.params.commentId, "replies._id": req.params.replyId})
  .then((comment)=>{
    if(!comment){
      return res.status(404).json({success: false, status: "not found"});
    }

    for(let i = 0; i < comment.replies.length; i++){
      if(comment.replies[i]._id.equals(req.params.replyId)){
        comment.replies[i].hidden = true;
        break;
      }
    }

    comment.save()
    .then((r)=>{
      return res.status(200).json({success: true});
    })
    .catch((err)=>{
      console.log("Error from /reviews/phone/comments/:commentId/replies/:replyId/hide: ", err);
      return res.status(500).json({success: false, status: "error hiding the phone reply"});
    });
  })
  .catch((err)=>{
    console.log("Error from /reviews/phone/comments/:commentId/replies/:replyId/hide: ", err);
    return res.status(500).json({success: false, status: "error hiding the phone reply"});
  });
});






// hide a company review reply
reviewRouter.put("/company/comments/:commentId/replies/:replyId/hide", cors.cors, rateLimit, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next)=>{
  COMPANY_REVS_COMMENTS.findOne({_id: req.params.commentId, "replies._id": req.params.replyId})
  .then((comment)=>{
    if(!comment){
      return res.status(404).json({success: false, status: "not found"});
    }

    for(let i = 0; i < comment.replies.length; i++){
      if(comment.replies[i]._id.equals(req.params.replyId)){
        comment.replies[i].hidden = true;
        break;
      }
    }

    comment.save()
    .then((r)=>{
      return res.status(200).json({success: true});
    })
    .catch((err)=>{
      console.log("Error from /reviews/company/comments/:commentId/replies/:replyId/hide: ", err);
      return res.status(500).json({success: false, status: "error hiding the company reply"});
    });
  })
  .catch((err)=>{
    console.log("Error from /reviews/company/comments/:commentId/replies/:replyId/hide: ", err);
    return res.status(500).json({success: false, status: "error hiding the company reply"});
  });
});





// unhide a phone review reply
reviewRouter.put("/phone/comments/:commentId/replies/:replyId/unhide", cors.cors, rateLimit, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next)=>{
  PHONE_REVS_COMMENTS.findOne({_id: req.params.commentId, "replies._id": req.params.replyId})
  .then((comment)=>{
    if(!comment){
      return res.status(404).json({success: false, status: "not found"});
    }

    for(let i = 0; i < comment.replies.length; i++){
      if(comment.replies[i]._id.equals(req.params.replyId)){
        comment.replies[i].hidden = false;
        break;
      }
    }

    comment.save()
    .then((r)=>{
      return res.status(200).json({success: true});
    })
    .catch((err)=>{
      console.log("Error from /reviews/phone/comments/:commentId/replies/:replyId/unhide: ", err);
      return res.status(500).json({success: false, status: "error unhiding the phone reply"});
    });
  })
  .catch((err)=>{
    console.log("Error from /reviews/phone/comments/:commentId/replies/:replyId/unhide: ", err);
    return res.status(500).json({success: false, status: "error unhiding the phone reply"});
  });
});






// unhide a company review reply
reviewRouter.put("/company/comments/:commentId/replies/:replyId/unhide", cors.cors, rateLimit, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next)=>{
  COMPANY_REVS_COMMENTS.findOne({_id: req.params.commentId, "replies._id": req.params.replyId})
  .then((comment)=>{
    if(!comment){
      return res.status(404).json({success: false, status: "not found"});
    }

    for(let i = 0; i < comment.replies.length; i++){
      if(comment.replies[i]._id.equals(req.params.replyId)){
        comment.replies[i].hidden = false;
        break;
      }
    }

    comment.save()
    .then((r)=>{
      return res.status(200).json({success: true});
    })
    .catch((err)=>{
      console.log("Error from /reviews/company/comments/:commentId/replies/:replyId/unhide: ", err);
      return res.status(500).json({success: false, status: "error unhiding the company reply"});
    });
  })
  .catch((err)=>{
    console.log("Error from /reviews/company/comments/:commentId/replies/:replyId/unhide: ", err);
    return res.status(500).json({success: false, status: "error unhiding the company reply"});
  });
});








module.exports = reviewRouter;