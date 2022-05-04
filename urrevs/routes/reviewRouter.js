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
      let like = await PHONE_REVS_LIKES.findOne({user: req.user._id, review: rev._id});
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
      let like = await COMPANY_REVS_LIKES.findOne({user: req.user._id, review: rev._id});
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
    let likes = await PHONE_REVS_LIKES.find({user: req.user._id, review: {$in: idsList}});
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
    let likes = await PHONE_REVS_LIKES.find({user: req.user._id, review: {$in: idsList}});
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

    // checking liked state
    let likes = await COMPANY_REVS_LIKES.find({user: req.user._id, review: {$in: idsList}});
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
    let likes = await COMPANY_REVS_LIKES.find({user: req.user._id, review: {$in: idsList}});
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
      let likes = await PHONE_REVS_LIKES.find({user: req.user._id, review: {$in: idsList}});
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
      let likes = await COMPANY_REVS_LIKES.find({user: req.user._id, review: {$in: idsList}});
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
    2- the user unlikes the review ---> the like document is updated
    3- the user likes the review ---> the like document is updated
*/



// like a phone review
/*
  steps:
    1- check if the review exists
    2- check if the review is not made by the user
    3- increase the likes count by 1
    4- get the latest like by this user on this review
      if it doesn't exist, create it and give points to the review author
      if it exists, check if it is unliked. 
        if not unliked, return error
        if unliked, modify it to be liked and give points to the review author
*/
reviewRouter.post("/phone/:revId/like", cors.cors, rateLimit.regular, authenticate.verifyUser, (req, res, next)=>{
  // check if the review exists - check if the review is not made by the user - increase the likes count by 1
  PHONEREV.findOneAndUpdate({_id: req.params.revId, user: {$ne: req.user._id}}, {$inc: {likes: 1}}, {new: true})
  .then((rev)=>{
    if(!rev){
      return res.status(404).json({
        success: false,
        status: "review not found or you own it"
      });
    }

    // get the latest like by this user on this review
    let proms1 = [];
    proms1.push(PHONE_REVS_LIKES.findOne({user: req.user._id, review: req.params.revId}));
    proms1.push(CONSTANT.findOne({name: "AILastQuery"}));
    Promise.all(proms1)
    .then(async(results)=>{
      let like = results[0];
      let lastQuery = results[1];
      if(lastQuery){
        lastQuery = lastQuery.date;
      }
      else{
        lastQuery = process.env.AI_LAST_QUERY_DEFAULT || config.AI_LAST_QUERY_DEFAULT;
      }

      if(like){
        // if not unliked, return error
        if(!like.unliked){
          await PHONEREV.findByIdAndUpdate(req.params.revId, {$inc: {likes: -1}});
          return res.status(403).json({
            success: false,
            status: "already liked"
          });
        }
        else{
          // if unliked, modify it to be liked - give points to the review author
          let proms = [];
          if(like.updatedAt >= lastQuery){
            proms.push(PHONE_REVS_UNLIKES.findOneAndRemove({user: req.user._id, review: req.params.revId, createdAt: {$gte: lastQuery}}));
          }
          proms.push(PHONE_REVS_LIKES.findByIdAndUpdate(like._id, {$set: {unliked: false}}));
          proms.push(USER.findOneAndUpdate({_id: rev.user}, {$inc: {comPoints: parseInt((process.env.REV_LIKE_POINTS|| config.REV_LIKE_POINTS))}}));
          Promise.all(proms).then(()=>{
            return res.status(200).json({
              success: true,
              status: "ok"
            });
          })
          .catch((err)=>{
            console.log("Error from POST /reviews/phone/:revId/like: ", err);
            return res.status(500).json({
              success: false,
              status: "internal server error",
              err: "Giving points to the review author or saving the like document failed"
            });
          })
        }  
      }
      else{
        // create the like document - give points to the review author
        let proms = [];
        proms.push(PHONE_REVS_LIKES.create({user: req.user._id, review: req.params.revId}));
        proms.push(USER.findOneAndUpdate({_id: rev.user}, {$inc: {comPoints: parseInt((process.env.REV_LIKE_POINTS|| config.REV_LIKE_POINTS))}}))
        
        Promise.all(proms)
        .then((user)=>{
          return res.status(200).json({
            success: true,
            status: "ok"
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
      }
    });
  })
  .catch((err)=>{
    console.log("Error from POST /reviews/phone/:revId/like: ", err);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: "Liking a phone review failed"
    });
  });
});






// like a company review
/*
  steps:
    1- check if the review exists
    2- check if the review is not made by the user
    3- increase the likes count by 1
    4- get the latest like by this user on this review
      if it doesn't exist, create it and give points to the review author
      if it exists, check if it is unliked. 
        if not unliked, return error
        if unliked, modify it to be liked and give points to the review author
*/
reviewRouter.post("/company/:revId/like", cors.cors, rateLimit.regular, authenticate.verifyUser, (req, res, next)=>{
  // check if the review exists - check if the review is not made by the user - increase the likes count by 1
  COMPANYREV.findOneAndUpdate({_id: req.params.revId, user: {$ne: req.user._id}}, {$inc: {likes: 1}}, {new: true})
  .then((rev)=>{
    if(!rev){
      return res.status(404).json({
        success: false,
        status: "review not found or you own it"
      });
    }

    // get the latest like by this user on this review
    let proms1 = [];
    proms1.push(COMPANY_REVS_LIKES.findOne({user: req.user._id, review: req.params.revId}));
    proms1.push(CONSTANT.findOne({name: "AILastQuery"}));
    Promise.all(proms1)
    .then(async(results)=>{
      let like = results[0];
      let lastQuery = results[1];
      if(lastQuery){
        lastQuery = lastQuery.date;
      }
      else{
        lastQuery = process.env.AI_LAST_QUERY_DEFAULT || config.AI_LAST_QUERY_DEFAULT;
      }

      if(like){
        // if not unliked, return error
        if(!like.unliked){
          await COMPANYREV.findByIdAndUpdate(req.params.revId, {$inc: {likes: -1}});
          return res.status(403).json({
            success: false,
            status: "already liked"
          });
        }
        else{
          // if unliked, modify it to be liked - give points to the review author
          let proms = [];
          if(like.updatedAt >= lastQuery){
            proms.push(COMPANY_REVS_UNLIKES.findOneAndRemove({user: req.user._id, review: req.params.revId, createdAt: {$gte: lastQuery}}));
          }
          proms.push(COMPANY_REVS_LIKES.findByIdAndUpdate(like._id, {$set: {unliked: false}}));
          proms.push(USER.findOneAndUpdate({_id: rev.user}, {$inc: {comPoints: parseInt((process.env.REV_LIKE_POINTS|| config.REV_LIKE_POINTS))}}));
          Promise.all(proms).then(()=>{
            return res.status(200).json({
              success: true,
              status: "ok"
            });
          })
          .catch((err)=>{
            console.log("Error from POST /reviews/company/:revId/like: ", err);
            return res.status(500).json({
              success: false,
              status: "internal server error",
              err: "Giving points to the review author or saving the like document failed"
            });
          })
        }  
      }
      else{
        // create the like document - give points to the review author
        let proms = [];
        proms.push(COMPANY_REVS_LIKES.create({user: req.user._id, review: req.params.revId}));
        proms.push(USER.findOneAndUpdate({_id: rev.user}, {$inc: {comPoints: parseInt((process.env.REV_LIKE_POINTS|| config.REV_LIKE_POINTS))}}))
        
        Promise.all(proms)
        .then((user)=>{
          return res.status(200).json({
            success: true,
            status: "ok"
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
      }
    });
  })
  .catch((err)=>{
    console.log("Error from POST /reviews/company/:revId/like: ", err);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: "Liking a company review failed"
    });
  });
});





// unlike a phone review
/*
  steps:
    1- check if the review exists
    2- check if the review is not made by the user
    3- decrease the likes count by 1
    4- if the number of likes is -1 or less (after the decrease), return error
    4- get the date of the last AI query
    5- get the latest like by this user on this review
    6- if it doesn't exist, return error
    7- check if it is unliked
      if not unliked and the creation date is before the last AI query, modify it to be unliked and create an unlike document
      if not unliked and the creation date is after the last AI query, modify the like document to be unliked
      if unliked, return error
*/
reviewRouter.post("/phone/:revId/unlike", cors.cors, rateLimit.regular, authenticate.verifyUser, (req, res, next)=>{
  // check if the review exists - check if the review is not made by the user - remove points from the review author
  PHONEREV.findOneAndUpdate({_id: req.params.revId, user: {$ne: req.user._id}}, {$inc: {likes: -1}}, {new: true})
  .then(async(rev)=>{
    if(!rev){
      return res.status(404).json({
        success: false,
        status: "review not found or you own it"
      });
    }

    // check if the number of likes is 0. if so, return error. if not, continue
    if(rev.likes <= -1){
      try{
        await PHONEREV.findByIdAndUpdate(req.params.revId, {$set: {likes: 0}});
        return res.status(403).json({
          success: false,
          status: "no likes"
        });
      }
      catch(err){
        console.log("Error from POST /reviews/phone/:revId/unlike: ", err);
        return res.status(500).json({
          success: false,
          status: "internal server error",
          err: "reverting the likes to 0 failed"
        });
      }
    }

    let proms1 = [];
    proms1.push(PHONE_REVS_LIKES.findOne({user: req.user._id, review: req.params.revId}));
    proms1.push(CONSTANT.findOne({name: "AILastQuery"}, {date: 1}));
    Promise.all(proms1).then(async(results)=>{
      let like = results[0];
      let lastAiQuery = results[1];
      if(lastAiQuery == null){
        lastAiQuery = process.env.AI_LAST_QUERY_DEFAULT || config.AI_LAST_QUERY_DEFAULT;
      }
      else{
        lastAiQuery = lastAiQuery.date;
      }
      if(like){
        if(like.unliked){
          await PHONEREV.findByIdAndUpdate(req.params.revId, {$inc: {likes: 1}});
          return res.status(403).json({
            success: false,
            status: "already unliked"
          });
        }
        else{
          let proms = [];
          // modify the like to be unliked - remove points from the review author - create an unlike document
          if((like.createdAt < lastAiQuery && like.updatedAt < lastAiQuery)|| (like.updatedAt > lastAiQuery && like.createdAt < lastAiQuery)){
            proms.push(PHONE_REVS_UNLIKES.create({user: req.user._id, review: req.params.revId}));
          }
          proms.push(PHONE_REVS_LIKES.findByIdAndUpdate(like._id, {$set: {unliked: true}}));
          proms.push(USER.findOneAndUpdate({_id: rev.user}, {$inc: {comPoints: -parseInt((process.env.REV_LIKE_POINTS|| config.REV_LIKE_POINTS))}}));
          Promise.all(proms).then((result)=>{
            return res.status(200).json({
              success: true,
              status: "ok"
            });
          })
          .catch((err)=>{
            console.log("Error from POST /reviews/phone/:revId/unlike: ", err);
            return res.status(500).json({
              success: false,
              status: "internal server error",
              err: "Removing points from the review author or creating the unlike document failed"
            });
          });
        }
      }
      else{
        await PHONEREV.findByIdAndUpdate(req.params.revId, {$inc: {likes: 1}});
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
        err: "getting the last AI query or the like document failed"
      });
    });
  })
  .catch((err)=>{
    console.log("Error from POST /reviews/phone/:revId/unlike: ", err);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: "Unliking a phone review failed"
    });
  })
});






// unlike a company review
/*
  steps:
    1- check if the review exists
    2- check if the review is not made by the user
    3- decrease the likes count by 1
    4- if the number of likes is -1 or less (after the decrease), return error
    4- get the date of the last AI query
    5- get the latest like by this user on this review
    6- if it doesn't exist, return error
    7- check if it is unliked
      if not unliked and the creation date is before the last AI query, modify it to be unliked and create an unlike document
      if not unliked and the creation date is after the last AI query, modify the like document to be unliked
      if unliked, return error
*/
reviewRouter.post("/company/:revId/unlike", cors.cors, rateLimit.regular, authenticate.verifyUser, (req, res, next)=>{
  // check if the review exists - check if the review is not made by the user - remove points from the review author
  COMPANYREV.findOneAndUpdate({_id: req.params.revId, user: {$ne: req.user._id}}, {$inc: {likes: -1}}, {new: true})
  .then(async(rev)=>{
    if(!rev){
      return res.status(404).json({
        success: false,
        status: "review not found or you own it"
      });
    }

    // check if the number of likes is 0. if so, return error. if not, continue
    if(rev.likes <= -1){
      try{
        await COMPANYREV.findByIdAndUpdate(req.params.revId, {$set: {likes: 0}});
        return res.status(403).json({
          success: false,
          status: "no likes"
        });
      }
      catch(err){
        console.log("Error from POST /reviews/company/:revId/unlike: ", err);
        return res.status(500).json({
          success: false,
          status: "internal server error",
          err: "reverting the likes to 0 failed"
        });
      }
    }

    let proms1 = [];
    proms1.push(COMPANY_REVS_LIKES.findOne({user: req.user._id, review: req.params.revId}));
    proms1.push(CONSTANT.findOne({name: "AILastQuery"}, {date: 1}));
    Promise.all(proms1).then(async(results)=>{
      let like = results[0];
      let lastAiQuery = results[1];
      if(lastAiQuery == null){
        lastAiQuery = process.env.AI_LAST_QUERY_DEFAULT || config.AI_LAST_QUERY_DEFAULT;
      }
      else{
        lastAiQuery = lastAiQuery.date;
      }
      if(like){
        if(like.unliked){
          await COMPANYREV.findByIdAndUpdate(req.params.revId, {$inc: {likes: 1}});
          return res.status(403).json({
            success: false,
            status: "already unliked"
          });
        }
        else{
          let proms = [];
          // modify the like to be unliked - remove points from the review author - create an unlike document
          if((like.createdAt < lastAiQuery && like.updatedAt < lastAiQuery)|| (like.updatedAt > lastAiQuery && like.createdAt < lastAiQuery)){
            proms.push(COMPANY_REVS_UNLIKES.create({user: req.user._id, review: req.params.revId}));
          }
          proms.push(COMPANY_REVS_LIKES.findByIdAndUpdate(like._id, {$set: {unliked: true}}));
          proms.push(USER.findOneAndUpdate({_id: rev.user}, {$inc: {comPoints: -parseInt((process.env.REV_LIKE_POINTS|| config.REV_LIKE_POINTS))}}));
          Promise.all(proms).then((result)=>{
            return res.status(200).json({
              success: true,
              status: "ok"
            });
          })
          .catch((err)=>{
            console.log("Error from POST /reviews/company/:revId/unlike: ", err);
            return res.status(500).json({
              success: false,
              status: "internal server error",
              err: "Removing points from the review author or creating the unlike document failed"
            });
          });
        }
      }
      else{
        await COMPANYREV.findByIdAndUpdate(req.params.revId, {$inc: {likes: 1}});
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
        err: "getting the last AI query or the like document failed"
      });
    });
  })
  .catch((err)=>{
    console.log("Error from POST /reviews/company/:revId/unlike: ", err);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: "Unliking a company review failed"
    });
  })
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

  // check if the review exists
  PHONEREV.findOne({_id: req.params.revId}).then((rev)=>{
    if(!rev){
      return res.status(404).json({
        success: false,
        status: "review not found"
      });
    }

    // create the comment document
    PHONE_REVS_COMMENTS.create({
      user: req.user._id,
      review: req.params.revId,
      content: content
    }).then((comment)=>{
      return res.status(200).json({
        success: true,
        comment: comment._id
      });
    })
    .catch((err)=>{
      console.log("Error from POST /reviews/phone/:revId/comments: ", err);
      return res.status(500).json({
        success: false,
        status: "internal server error",
        err: "creating the comment document failed"
      });
    })
  })
  .catch((err)=>{
    console.log("Error from POST /reviews/phone/:revId/comments: ", err);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: "Finding the phone review failed"
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

  // check if the review exists
  COMPANYREV.findOne({_id: req.params.revId}).then((rev)=>{
    if(!rev){
      return res.status(404).json({
        success: false,
        status: "review not found"
      });
    }

    // create the comment document
    COMPANY_REVS_COMMENTS.create({
      user: req.user._id,
      review: req.params.revId,
      content: content
    }).then((comment)=>{
      return res.status(200).json({
        success: true,
        comment: comment._id
      });
    })
    .catch((err)=>{
      console.log("Error from POST /reviews/company/:revId/comments: ", err);
      return res.status(500).json({
        success: false,
        status: "internal server error",
        err: "creating the comment document failed"
      });
    })
  })
  .catch((err)=>{
    console.log("Error from POST /reviews/company/:revId/comments: ", err);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: "Finding the company review failed"
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

  // create the reply document
  let reply = {
    user: req.user._id,
    content: content
  };

  PHONE_REVS_COMMENTS.findByIdAndUpdate(req.params.commentId, {$push: {replies: reply}}, {new: true})
  .then((comment)=>{
    if(!comment){
      return res.status(404).json({
        success: false,
        status: "comment not found"
      });
    }
    else{
      return res.status(200).json({
        success: true,
        reply: comment.replies[comment.replies.length-1]._id
      });
    }
  })
  .catch((err)=>{
    console.log("Error from POST /reviews/phone/comments/:commentId/replies: ", err);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: "creating the reply document failed"
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

  // create the reply document
  let reply = {
    user: req.user._id,
    content: content
  };

  COMPANY_REVS_COMMENTS.findByIdAndUpdate(req.params.commentId, {$push: {replies: reply}}, {new: true})
  .then((comment)=>{
    if(!comment){
      return res.status(404).json({
        success: false,
        status: "comment not found"
      });
    }
    else{
      return res.status(200).json({
        success: true,
        reply: comment.replies[comment.replies.length-1]._id
      });
    }
  })
  .catch((err)=>{
    console.log("Error from POST /reviews/company/comments/:commentId/replies: ", err);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: "creating the reply document failed"
    });
  });
});



module.exports = reviewRouter;