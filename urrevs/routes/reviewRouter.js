/*
  Author: Abdelrahman Hany
  Created on: 1-May-2022
*/

const express = require("express");
const axios = require("axios");
const https = require("https");
const fs = require("fs");

const reviewRouter = express.Router();

const cors = require("../utils/cors");
const rateLimit = require("../utils/rateLimit");
const authenticate = require("../utils/authenticate");
const likeComment = require("../utils/likeCommentOrAnswer");
const unlikeComment = require("../utils/unlikeCommentOrAnswer");
const unlikeReply = require("../utils/unlikeReply");
const likeReply = require("../utils/likeReply");
const addReply = require("../utils/addReply");

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
const addComment = require("../utils/addCommentOrAnswer");

const config = require("../config");

//--------------------------------------------------------------------

reviewRouter.options("*", cors.cors, (req, res, next)=>{
  res.sendStatus(200);
});

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
  14- give points to the referral (if exists) (the referral must not be the user himself)
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
          }

          // give points to the user - give points to the referral (if exists). the referral must not be the user himself
          let staeg3Proms = [];
          staeg3Proms.push(USER.findByIdAndUpdate(req.user._id, {$inc: {comPoints: grade}}));
          if(refCode){
            staeg3Proms.push(USER.findOneAndUpdate({refCode: refCode, _id: {$ne: req.user._id}}, {$inc: {comPoints: parseInt(process.env.REFFERAL_REV_POINTS || config.REFFERAL_REV_POINTS)}}));
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



// Get a certain phone review
reviewRouter.get("/phone/:revId", cors.cors, rateLimit.regular, authenticate.verifyFlexible, (req, res, next)=>{
  PHONEREV.findByIdAndUpdate(req.params.revId, {$inc: {views: 1}})
  .populate("user", {name: 1, picture: 1})
  .populate("phone", {name: 1})
  .then(async (rev)=>{
    if(!rev){
      return res.status(404).json({
        success: false,
        status: "not found"
      });
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
      liked: false
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
reviewRouter.get("/company/:revId", cors.cors, rateLimit.regular, authenticate.verifyFlexible, (req, res, next)=>{
  COMPANYREV.findByIdAndUpdate(req.params.revId, {$inc: {views: 1}})
  .populate("user", {name: 1, picture: 1})
  .populate("company", {name: 1})
  .then(async (rev)=>{
    if(!rev){
      return res.status(404).json({
        success: false,
        status: "not found"
      });
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
      liked: false
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
reviewRouter.get("/phone/by/me", cors.cors, rateLimit.regular, authenticate.verifyUser, (req, res, next)=>{
  
  let itemsPerRound = parseInt((process.env.MY_PHONE_REVS_PER_ROUND|| config.MY_PHONE_REVS_PER_ROUND));
  let roundNum = req.query.round;
  if(!roundNum || isNaN(roundNum)){
      return res.status(400).json({
        success: false,
        status: "bad request",
      });
  }

  PHONEREV.find({user: req.user._id})
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
        liked: false
      });
    }

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
reviewRouter.get("/phone/by/:userId", cors.cors, rateLimit.regular, authenticate.verifyUser, (req, res, next)=>{
  
  let itemsPerRound = parseInt((process.env.ANOTHER_USER_PHONE_REVS_PER_ROUND|| config.ANOTHER_USER_PHONE_REVS_PER_ROUND));
  let roundNum = req.query.round;
  if(!roundNum || isNaN(roundNum)){
      return res.status(400).json({
        success: false,
        status: "bad request",
      });
  }

  PHONEREV.find({user: req.params.userId})
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
        liked: false
      });
    }

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
reviewRouter.get("/company/by/me", cors.cors, rateLimit.regular, authenticate.verifyUser, (req, res, next)=>{
  
  let itemsPerRound = parseInt((process.env.MY_COMPANY_REVS_PER_ROUND|| config.MY_COMPANY_REVS_PER_ROUND));
  let roundNum = req.query.round;
  if(!roundNum || isNaN(roundNum)){
      return res.status(400).json({
        success: false,
        status: "bad request",
      });
  }

  COMPANYREV.find({user: req.user._id})
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
        liked: false
      });
    }

    // checking liked 
    let likes;
    try{
      likes = await COMPANY_REVS_LIKES.find({user: req.user._id, review: {$in: idsList}, unliked: false});
    }
    catch(err){
      console.log("Error from /reviews/company/by/me: ", err);
      return res.status(500).json({
        success: false,
        status: "internal server error",
        err: "Finding the liked state failed"
      });
    }
    for(let like of likes){
      resultRevs[ids[like.review]].liked = true;
    }

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
reviewRouter.get("/company/by/:userId", cors.cors, rateLimit.regular, authenticate.verifyUser, (req, res, next)=>{
  
  let itemsPerRound = parseInt((process.env.ANOTHER_USER_COMPANY_REVS_PER_ROUND|| config.ANOTHER_USER_COMPANY_REVS_PER_ROUND));
  let roundNum = req.query.round;
  if(!roundNum || isNaN(roundNum)){
      return res.status(400).json({
        success: false,
        status: "bad request",
      });
  }

  COMPANYREV.find({user: req.params.userId})
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
        liked: false
      });
    }

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
reviewRouter.get("/phone/on/:phoneId", cors.cors, rateLimit.regular, authenticate.verifyFlexible, (req, res, next)=>{
  
  let itemsPerRound = parseInt((process.env.PHONE_REVS_PER_ROUND|| config.PHONE_REVS_PER_ROUND));
  let roundNum = req.query.round;
  if(!roundNum || isNaN(roundNum)){
      return res.status(400).json({
        success: false,
        status: "bad request",
      });
  }

  PHONEREV.find({phone: req.params.phoneId})
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
        liked: false
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
reviewRouter.get("/company/on/:companyId", cors.cors, rateLimit.regular, authenticate.verifyFlexible, (req, res, next)=>{
  
  let itemsPerRound = parseInt((process.env.COMPANY_REVS_PER_ROUND|| config.COMPANY_REVS_PER_ROUND));
  let roundNum = req.query.round;
  if(!roundNum || isNaN(roundNum)){
      return res.status(400).json({
        success: false,
        status: "bad request",
      });
  }

  COMPANYREV.find({company: req.params.companyId})
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
        liked: false
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
reviewRouter.post("/phone/:revId/like", cors.cors, rateLimit.regular, authenticate.verifyUser, (req, res, next)=>{

  // checking if the user already liked the review
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
      proms1.push(PHONEREV.findOneAndUpdate({_id: req.params.revId, user: {$ne: req.user._id}}, {$inc: {likes: 1}}));
      proms1.push(CONSTANT.findOne({name: "AILastQuery"}, {date: 1, _id: 0}));
      Promise.all(proms1).then((results)=>{
        let rev = results[0];
        let lastQuery = results[1].date;

        if(!rev){
          return res.status(404).json({
            success: false,
            status: "review not found or you own it"
          });
        }

        if(!lastQuery){
          lastQuery = process.env.AI_LAST_QUERY_DEFAULT || config.AI_LAST_QUERY_DEFAULT;
        }

        let proms2 = [];
        // if the updatedAt of the like document is newer than the last query, delete the unlike document that is created later than the date of the last query
        if(like.updatedAt >= lastQuery){
          proms2.push(PHONE_REVS_UNLIKES.findOneAndRemove({user: req.user._id, review: req.params.revId, createdAt: {$gte: lastQuery}}));
        }
        // updating the like document to have the unliked = false
        proms2.push(PHONE_REVS_LIKES.findByIdAndUpdate(like._id, {$set: {unliked: false}}));
        // giving points to the user
        proms2.push(USER.findOneAndUpdate({_id: rev.user}, {$inc: {comPoints: parseInt((process.env.REV_LIKE_POINTS|| config.REV_LIKE_POINTS))}}));
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
      PHONEREV.findOneAndUpdate({_id: req.params.revId, user: {$ne: req.user._id}}, {$inc: {likes: 1}})
      .then((rev)=>{
        if(!rev){
          return res.status(404).json({
            success: false,
            status: "review not found or you own it"
          });
        }

        let proms = [];
        proms.push(PHONE_REVS_LIKES.create({user: req.user._id, review: req.params.revId}));
        proms.push(USER.findOneAndUpdate({_id: rev.user}, {$inc: {comPoints: parseInt((process.env.REV_LIKE_POINTS|| config.REV_LIKE_POINTS))}}))
        
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
reviewRouter.post("/phone/:revId/unlike", cors.cors, rateLimit.regular, authenticate.verifyUser, (req, res, next)=>{
  let proms = [];
  proms.push(PHONE_REVS_LIKES.findOne({user: req.user._id, review: req.params.revId}));
  proms.push(PHONEREV.findOne({_id: req.params.revId, user: {$ne: req.user._id}}));
  
  Promise.all(proms).then((firstResults)=>{
    let like = firstResults[0];
    let rev = firstResults[1];

    if(!rev){
      return res.status(404).json({
        success: false,
        status: "review not found or you own it"
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
      proms1.push(PHONEREV.findOneAndUpdate({_id: req.params.revId, user: {$ne: req.user._id}}, {$inc: {likes: -1}}, {new: true}));
      proms1.push(CONSTANT.findOne({name: "AILastQuery"}, {date: 1, _id: 0}));
      
      Promise.all(proms1).then(async(results)=>{
        let rev = results[0];
        let lastQuery = results[1].date;

        if(!rev){
          return res.status(404).json({
            success: false,
            status: "review not found or you own it"
          });
        }

        if(rev.likes < 0){
          try{
            await PHONEREV.findOneAndUpdate({_id: req.params.revId, user: {$ne: req.user._id}}, {$inc: {likes: 1}});
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

        if(!lastQuery){
          lastQuery = process.env.AI_LAST_QUERY_DEFAULT || config.AI_LAST_QUERY_DEFAULT;
        }

        let proms = [];
        // modify the like to be unliked - remove points from the review author - create an unlike document
        if((like.createdAt < lastQuery && like.updatedAt < lastQuery) || 
        (like.updatedAt > lastQuery && like.createdAt < lastQuery)){
          proms.push(PHONE_REVS_UNLIKES.create({user: req.user._id, review: req.params.revId}));
        }
        proms.push(PHONE_REVS_LIKES.findByIdAndUpdate(like._id, {$set: {unliked: true}}));
        proms.push(USER.findOneAndUpdate({_id: rev.user}, {$inc: {comPoints: -parseInt((process.env.REV_LIKE_POINTS|| config.REV_LIKE_POINTS))}}));
      
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
reviewRouter.post("/company/:revId/like", cors.cors, rateLimit.regular, authenticate.verifyUser, (req, res, next)=>{

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
      proms1.push(COMPANYREV.findOneAndUpdate({_id: req.params.revId, user: {$ne: req.user._id}}, {$inc: {likes: 1}}));
      proms1.push(CONSTANT.findOne({name: "AILastQuery"}, {date: 1, _id: 0}));
      Promise.all(proms1).then((results)=>{
        let rev = results[0];
        let lastQuery = results[1].date;

        if(!rev){
          return res.status(404).json({
            success: false,
            status: "review not found or you own it"
          });
        }

        if(!lastQuery){
          lastQuery = process.env.AI_LAST_QUERY_DEFAULT || config.AI_LAST_QUERY_DEFAULT;
        }

        let proms2 = [];
        // if the updatedAt of the like document is newer than the last query, delete the unlike document that is created later than the date of the last query
        if(like.updatedAt >= lastQuery){
          proms2.push(COMPANY_REVS_UNLIKES.findOneAndRemove({user: req.user._id, review: req.params.revId, createdAt: {$gte: lastQuery}}));
        }
        // updating the like document to have the unliked = false
        proms2.push(COMPANY_REVS_LIKES.findByIdAndUpdate(like._id, {$set: {unliked: false}}));
        // giving points to the user
        proms2.push(USER.findOneAndUpdate({_id: rev.user}, {$inc: {comPoints: parseInt((process.env.REV_LIKE_POINTS|| config.REV_LIKE_POINTS))}}));
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
      COMPANYREV.findOneAndUpdate({_id: req.params.revId, user: {$ne: req.user._id}}, {$inc: {likes: 1}})
      .then((rev)=>{
        if(!rev){
          return res.status(404).json({
            success: false,
            status: "review not found or you own it"
          });
        }

        let proms = [];
        proms.push(COMPANY_REVS_LIKES.create({user: req.user._id, review: req.params.revId}));
        proms.push(USER.findOneAndUpdate({_id: rev.user}, {$inc: {comPoints: parseInt((process.env.REV_LIKE_POINTS|| config.REV_LIKE_POINTS))}}))
        
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
reviewRouter.post("/company/:revId/unlike", cors.cors, rateLimit.regular, authenticate.verifyUser, (req, res, next)=>{
  let proms = [];
  proms.push(COMPANY_REVS_LIKES.findOne({user: req.user._id, review: req.params.revId}));
  proms.push(COMPANYREV.findOne({_id: req.params.revId, user: {$ne: req.user._id}}));
  
  Promise.all(proms).then((firstResults)=>{
    let like = firstResults[0];
    let rev = firstResults[1];

    if(!rev){
      return res.status(404).json({
        success: false,
        status: "review not found or you own it"
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
      proms1.push(COMPANYREV.findOneAndUpdate({_id: req.params.revId, user: {$ne: req.user._id}}, {$inc: {likes: -1}}, {new: true}));
      proms1.push(CONSTANT.findOne({name: "AILastQuery"}, {date: 1, _id: 0}));
      
      Promise.all(proms1).then(async(results)=>{
        let rev = results[0];
        let lastQuery = results[1].date;

        if(!rev){
          return res.status(404).json({
            success: false,
            status: "review not found or you own it"
          });
        }

        if(rev.likes < 0){
          try{
            await COMPANYREV.findOneAndUpdate({_id: req.params.revId, user: {$ne: req.user._id}}, {$inc: {likes: 1}});
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

        if(!lastQuery){
          lastQuery = process.env.AI_LAST_QUERY_DEFAULT || config.AI_LAST_QUERY_DEFAULT;
        }

        let proms = [];
        // modify the like to be unliked - remove points from the review author - create an unlike document
        if((like.createdAt < lastQuery && like.updatedAt < lastQuery) || 
        (like.updatedAt > lastQuery && like.createdAt < lastQuery)){
          proms.push(COMPANY_REVS_UNLIKES.create({user: req.user._id, review: req.params.revId}));
        }
        proms.push(COMPANY_REVS_LIKES.findByIdAndUpdate(like._id, {$set: {unliked: true}}));
        proms.push(USER.findOneAndUpdate({_id: rev.user}, {$inc: {comPoints: -parseInt((process.env.REV_LIKE_POINTS|| config.REV_LIKE_POINTS))}}));
      
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
reviewRouter.post("/phone/:revId/comments", cors.cors, rateLimit.regular, authenticate.verifyUser, (req, res, next)=>{
  // extract the comment content from the request body
  let {content} = req.body;
  // check if the content is not empty
  if(!content){
    return res.status(400).json({
      success: false,
      status: "bad request"
    });
  }

  addComment(PHONEREV, req.params.revId, PHONE_REVS_COMMENTS, req.user._id, "review", "content", content)
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
reviewRouter.post("/company/:revId/comments", cors.cors, rateLimit.regular, authenticate.verifyUser, (req, res, next)=>{
  // extract the comment content from the request body
  let {content} = req.body;
  // check if the content is not empty
  if(!content){
    return res.status(400).json({
      success: false,
      status: "bad request"
    });
  }

  addComment(COMPANYREV, req.params.revId, COMPANY_REVS_COMMENTS, req.user._id, "review", "content", content)
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
reviewRouter.post("/phone/comments/:commentId/replies", cors.cors, rateLimit.regular, authenticate.verifyUser, (req, res, next)=>{
  // extract the comment content from the request body
  let {content} = req.body;

  // check if the content is not empty
  if(!content){
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
reviewRouter.post("/company/comments/:commentId/replies", cors.cors, rateLimit.regular, authenticate.verifyUser, (req, res, next)=>{
  // extract the comment content from the request body
  let {content} = req.body;

  // check if the content is not empty
  if(!content){
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
reviewRouter.get("/phone/:revId/comments", cors.cors, rateLimit.regular, authenticate.verifyFlexible, (req, res, next)=>{
  let itemsPerRound = parseInt((process.env.PHONE_REV_COMMENTS_PER_ROUND || config.PHONE_REV_COMMENTS_PER_ROUND));
  let roundNum = req.query.round;

  if(roundNum == null || isNaN(roundNum)){
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.json({success: false, status: "bad request"});
      return;
  }

  PHONE_REVS_COMMENTS.find({review: req.params.revId})
  .sort({likes: -1, createdAt: -1})
  .skip((roundNum - 1) * itemsPerRound)
  .limit(itemsPerRound)
  .populate("user", {name: 1, picture: 1})
  .populate("replies.user", {name: 1, picture: 1})
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
        content: comment.content,
        createdAt: comment.createdAt,
        likes: comment.likes,
        liked: false,
        replies: []
      };


      for(let i=comment.replies.length-1; i>=0; i--){
        let reply = comment.replies[i];
        comentRepliesIds.push(reply._id);
        commentRepliesObj[reply._id] = {comment: index, reply: comment.replies.length-1-i};
        resultComment.replies.push({
          _id: reply._id,
          userId: reply.user._id,
          userName: reply.user.name,
          userPicture: reply.user.picture,
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
reviewRouter.get("/company/:revId/comments", cors.cors, rateLimit.regular, authenticate.verifyFlexible, (req, res, next)=>{
  let itemsPerRound = parseInt((process.env.COMPANY_REV_COMMENTS_PER_ROUND || config.COMPANY_REV_COMMENTS_PER_ROUND));
  let roundNum = req.query.round;

  if(roundNum == null || isNaN(roundNum)){
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.json({success: false, status: "bad request"});
      return;
  }

  COMPANY_REVS_COMMENTS.find({review: req.params.revId})
  .sort({likes: -1, createdAt: -1})
  .skip((roundNum - 1) * itemsPerRound)
  .limit(itemsPerRound)
  .populate("user", {name: 1, picture: 1})
  .populate("replies.user", {name: 1, picture: 1})
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
        content: comment.content,
        createdAt: comment.createdAt,
        likes: comment.likes,
        liked: false,
        replies: []
      };


      for(let i=comment.replies.length-1; i>=0; i--){
        let reply = comment.replies[i];
        comentRepliesIds.push(reply._id);
        commentRepliesObj[reply._id] = {comment: index, reply: comment.replies.length-1-i};
        resultComment.replies.push({
          _id: reply._id,
          userId: reply.user._id,
          userName: reply.user.name,
          userPicture: reply.user.picture,
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
reviewRouter.post("/phone/comments/:commentId/like", cors.cors, rateLimit.regular, authenticate.verifyUser, (req, res, next)=>{
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
        status: "comment not found or you own it"
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
    console.log("Error from POST /reviews/phone/comments/:commentId/like: ", err.e);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: err.message
    });
  });
});



// unlike a comment on a phone review
reviewRouter.post("/phone/comments/:commentId/unlike", cors.cors, rateLimit.regular, authenticate.verifyUser, (req, res, next)=>{
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
reviewRouter.post("/company/comments/:commentId/like", cors.cors, rateLimit.regular, authenticate.verifyUser, (req, res, next)=>{
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
        status: "comment not found or you own it"
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
    console.log("Error from POST /reviews/company/comments/:commentId/like: ", err.e);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: err.message
    });
  });
});



// unlike a comment on a company review
reviewRouter.post("/company/comments/:commentId/unlike", cors.cors, rateLimit.regular, authenticate.verifyUser, (req, res, next)=>{
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
reviewRouter.post("/phone/comments/:commentId/replies/:replyId/like", cors.cors, rateLimit.regular, authenticate.verifyUser, (req, res, next)=>{
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
        status: "reply not found or you own it"
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
    console.log("Error from POST /reviews/phone/comments/:commentId/replies/:replyId/like: ", err.e);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: err.message
    });
  });
});



// unlike a phone review reply
reviewRouter.post("/phone/comments/:commentId/replies/:replyId/unlike", cors.cors, rateLimit.regular, authenticate.verifyUser, (req, res, next)=>{
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
reviewRouter.post("/company/comments/:commentId/replies/:replyId/like", cors.cors, rateLimit.regular, authenticate.verifyUser, (req, res, next)=>{
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
        status: "reply not found or you own it"
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
    console.log("Error from POST /reviews/company/comments/:commentId/replies/:replyId/like: ", err.e);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: err.message
    });
  });
});



// unlike a company review reply
reviewRouter.post("/company/comments/:commentId/replies/:replyId/unlike", cors.cors, rateLimit.regular, authenticate.verifyUser, (req, res, next)=>{
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




module.exports = reviewRouter;