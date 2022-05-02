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
                 
                CREATION
  6- create the phone review
  7- create the company review
                POST-CREATION
  8- calculate the average company rating
  9- increase the total reviews count in the company
  10- add the phone to the list of owned phones for the user
  11- calculate the points to give to the user using either AI service or the backup routine
  12- give points to the user
  13- give points to the referral (if exists)
  14- send the phone review as a response
*/
reviewRouter.post("/phone", cors.cors, rateLimit.regular, authenticate.verifyUser, (req, res, next) => {
  // extract data from request body  
  const {
        phoneId,
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
    || !compCons) {
      return res.status(400).json({
        success: false,
        status: "bad request"
      });
  }

  // checking if the phone exists
  PHONE.findById(phoneId, {company: 1, _id: 0}).then((phone)=>{
    if(!phone) {
      return res.status(404).json({
        success: false,
        status: "phone not found"
      });
    }

    // checking if the company exists
    COMPANY.findById(phone.company, {totalRevsCount: 1, avgRating: 1, _id: 0}).then((company)=>{
      if(!company){
        return res.status(404).json({
          success: false,
          status: "company not found"
        });
      }

      // checking if the user has already reviewed the phone
      PHONEREV.findOne({user: req.user._id, phone: phoneId}, {_id: 1}).then((phoneRev)=>{
        if(phoneRev) {
          return res.status(403).json({
            success: false,
            status: "already reviewed"
          });
        }

        // creating the phone review
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
        }).then((prev)=>{

          // creating the company review
          COMPANYREV.create({
            user: req.user._id,
            company: phone.company,
            generalRating: companyRating,
            pros: compPros,
            cons: compCons,
            corresPrev: prev._id
          }).then((crev)=>{
 
            //calculate the average company rating
            let oldAvgRating = company.avgRating;
            let oldTotalRevs = company.totalRevsCount;
            let newAvgRating = ((oldAvgRating * oldTotalRevs) + companyRating) / (oldTotalRevs + 1);
            // increase the total reviews count in the company
            COMPANY.findByIdAndUpdate(phone.company, {$set: {avgRating: newAvgRating, totalRevsCount: oldTotalRevs + 1}})
            .then((company)=>{
              
              // add the phone to the list of owned phones for the user
              OWNED_PHONE.create({
                user: req.user._id,
                phone: phoneId,
                ownedAt: ownedDate
              }).then(async (owned)=>{

                // calculate the points to give to the user
                let grade;
                // let's try to communicate to the AI service
                try{

                  let TIMEOUT = process.env.TIMEOUT || config.TIMEOUT;
                  var config = {
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
                  
                  const {data:resp} = await axios(config);
                  
                  grade = resp.grade;
                  console.log("--------------------Review grading AI Success--------------------");
                }
                catch(e){

                  console.log("--------------------Review grading AI Failed---------------------");
                  //console.log(e);
                  // since the AI service is down, we will use the backup routine
                  grade = 100;
                }

                // give points to the user
                USER.findByIdAndUpdate(req.user._id, 
                  {$inc: {comPoints: parseInt(grade)}})
                  .then(async(user)=>{

                    // give points to the referral (if exists)
                    if(refCode) {
                      try{
                        await USER.findOneAndUpdate({refCode: refCode}, 
                          {$inc: {comPoints: parseInt(process.env.REFFERAL_REV_POINTS || config.REFFERAL_REV_POINTS)}});
                      }
                      catch(e){
                        return res.status(500).json({
                          success: false,
                          status: "internal server error"
                        });
                      }
                    }

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
                      manQuality: manQuality,
                      valForMony: valFMon,
                      camera: camera,
                      callQuality: callQuality,
                      batteryRating: battery,
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
                      status: "internal server error"
                    });
                  });

              })
              .catch((err)=>{
                console.log("Error from /reviews/phone: ", err);
                return res.status(500).json({
                  success: false,
                  status: "internal server error"
                });
              });
            })
            .catch((err)=>{
              console.log("Error from /reviews/phone: ", err);
              return res.status(500).json({
                success: false,
                status: "internal server error"
              });
            });
          })
          .catch((err)=>{
            console.log("Error from /reviews/phone: ", err);
            return res.status(500).json({
              success: false,
              status: "internal server error"
            });
          })
        })
        .catch((err)=>{
          console.log("Error from /reviews/phone: ", err);
          return res.status(500).json({
            success: false,
            status: "internal server error"
          });
        });

      })
      .catch((err)=>{
        console.log("Error from /reviews/phone: ", err);
        return res.status(500).json({
          success: false,
          status: "internal server error"
        });
      });
      })
      .catch((err)=>{
        return res.status(500).json({
          success: false,
          status: "internal server error"
        });
      });
  })
  .catch((err)=>{
    console.log("Error from /reviews/phone: ", err);
    return res.status(500).json({
      success: false,
      status: "internal server error"
    });
  });
});


/*
                  USER.findByIdAndUpdate(req.user._id, 
                    {$inc: {comPoints: parseInt(grade)}})
                    .then((user)=>{
    
                      // give points to the referral (if exists)
                      if(refCode){
                        USER.findOneAndUpdate({refCode: refCode}, 
                          {$inc: {comPoints: parseInt(process.env.REFFERAL_REV_POINTS || config.REFFERAL_REV_POINTS)}})
                          .then((user)=>{

                            // send the phone review as a response
                            let resultRev = {
                              _id: prev._id,
                              type: "phone",
                              createdAt: prev.createdAt,
                              phoneId: phoneId,
                              phoneName: phone.name,
                              userId: req.user._id,
                              userName: req.user.name,
                              picture: req.user.picture,
                              ownedAt: ownedDate,
                              views: prev.views,
                              likes: prev.likes,
                              commentsCount: prev.commentsCount,
                              shares: prev.shares,
                              generalRating: generalRating,
                              uiRating: uiRating,
                              valForMony: valFMon,
                              camera: camera,
                              callQuality: callQuality,
                              batteryRating: battery,
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
                              status: "internal server error"
                            });
                          });
                      }
                      else{
                        console.log("--------------------Review grading is done by AI--------------------");
                        res.status(200).json({
                          success: true,
                          review: prev
                        });
                      }
                    })
                    .catch((err)=>{
                      console.log("Error from /reviews/phone: ", err);
                      return res.status(500).json({
                        success: false,
                        status: "internal server error"
                      });
                    });  
*/

module.exports = reviewRouter;