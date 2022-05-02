/*
  Author: Abdelrahman Hany
  Created on: 1-May-2022
*/

const express = require("express");
const axios = require("axios");
const https = require("https");

const reviewRouter = express.Router();

const cors = require("../utils/cors");
const rateLimit = require("../utils/rateLimit");
const authenticate = require("../utils/authenticate");

const USER = require("../models/user");
const PHONE = require("../models/phone");
const COMPANY = require("../models/company");
const PHONEREV = require("../models/phoneReview");
const COMPANYREV = require("../models/companyReview");
const OWNED_PHONE = require("../models/ownedPhone");

const config = require("../config");

//--------------------------------------------------------------------

// Endpoints Implementation


// Add a phone review (with embedded company review)
/*
  steps:
                PRE-CREATION
  1- extract data from request body
  2- checking if the required fields are provided
  3- checking if the phone exists
  4- checking if the company exists
  5- checking if the user has already reviewed the phone
  6- checking if the phone and company are matched
                 
                CREATION
  7- create the phone review
  8- create the company review

                POST-CREATION
  9- calculate the average company rating
  10- increase the total reviews count in the company
  11- add the phone to the owned phones for the user
  12- calculate the points to give to the user using either AI service or the backup routine
  13- give points to the user
  14- give points to the referral (if exists)
  15- send the phone review as a response
*/

reviewRouter.post("/phone", cors.cors, rateLimit.regular, authenticate.verifyUser, (req, res, next)=>{
  // extract data from request body  
  const {
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

  // checking if the phone exists - checking if the company exists - checking if the user has already reviewed the phone
  let stage1Proms = [];
  stage1Proms.push(PHONE.findById(phoneId));
  stage1Proms.push(COMPANY.findById(companyId));
  stage1Proms.push(PHONEREV.findOne({user: req.user._id, phone: phoneId}));

  Promise.all(stage1Proms).then((stage1Results)=>{
    let phone = stage1Results[0];
    let company = stage1Results[1];
    let pprev = stage1Results[2];
    
    if(!phone || !company){
      return res.status(404).json({
        success: false,
        status: "phone or company not found"
      });
    }
    
    if(pprev){
      return res.status(403).json({
        success: false,
        status: "already reviewed"
      });
    }

    // checking if the phone and company are matched
    if(!(phone.company.equals(companyId))){
      return res.status(400).json({
        success: false,
        status: "phone and company do not match"
      });
    }

    // create the phone review
    PHONEREV.create({
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
      cons: cons
    })
    .then((prev)=>{

      // create the company review
      COMPANYREV.create({
        user: req.user._id,
        company: companyId,
        generalRating: companyRating,
        pros: compPros,
        cons: compCons,
        corresPrev: prev._id
      })
      .then((crev)=>{
        
        // calculate the average company rating
        let oldAvgRating = company.avgRating;
        let oldTotalRevs = company.totalRevsCount;
        let newAvgRating = ((oldAvgRating * oldTotalRevs) + companyRating) / (oldTotalRevs + 1);
        
        // increase the total reviews count in the company - add the phone to the owned phones for the user
        let staeg2Proms = [];
        staeg2Proms.push(COMPANY.findByIdAndUpdate(companyId, {$inc: {totalRevsCount: 1}, $set: {avgRating: newAvgRating}}));
        staeg2Proms.push(OWNED_PHONE.create({user: req.user._id, phone: phoneId, ownedAt: ownedDate}));
        
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
            //console.log(e);
            // since the AI service is down, we will use the backup routine
            grade = 100;
          }

          // give points to the user - give points to the referral (if exists)
          let staeg3Proms = [];
          staeg3Proms.push(USER.findByIdAndUpdate(req.user._id, {$inc: {comPoints: grade}}));
          if(refCode){
            staeg3Proms.push(USER.findOneAndUpdate({refCode: refCode}, {$inc: {comPoints: parseInt(process.env.REFFERAL_REV_POINTS || config.REFFERAL_REV_POINTS)}}));
          }

          Promise.all(staeg3Proms).then((staeg3Results)=>{
            
            let user = staeg3Results[0];
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
            }
            res.status(200).json({
              success: true,
              review: resultRev,
              earnedPoints: grade
            });
          })
          .catch((err)=>{
            console.log("Error from /reviews/phone: ", err);
            return res.status(500).json({
              success: false,
              status: "internal servere ssserror",
              err: "Either giving the user or the referral points failed"
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
          console.log("Error from /reviews/phone: ", err);
          return res.status(500).json({
            success: false,
            status: "internal server error",
            err: "creating the company review failed, but the phone review is created successfully"
          });
        // // delete the previously created phone review
        // PHONEREV.findByIdAndDelete(prev._id).then(()=>{
        //   console.log("Error from /reviews/phone: ", err);
        //   return res.status(500).json({
        //     success: false,
        //     status: "internal server error",
        //     err: "creating the company review failed - deleting the phone review successfully"
        //   });
        // })
        // .catch((err2)=>{
        //   console.log("Error from /reviews/phone: ", err, "also there is an error from deleting the phone review: ", err2);
        //   return res.status(500).json({
        //     success: false,
        //     status: "internal server error",
        //     err: "creating the company review failed - deleting the phone review failed"
        //   });
        // });
      });
    })
    .catch((err)=>{
      console.log("Error from /reviews/phone: ", err);
      return res.status(500).json({
        success: false,
        status: "internal server error",
        err: "creating the phone review failed"
      });
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



module.exports = reviewRouter;