/*
  Author: Abdelrahman Hany
  Created on: 28-Apr-2022
*/

const express = require("express");
const jwt = require("jsonwebtoken");

const rateLimit = require("../utils/rateLimit/regular");
const cors = require("../utils/cors");
const authenticate = require("../utils/authenticate");
const config = require("../config");

const USER = require("../models/user");
const OWNED_PHONE = require("../models/ownedPhone");

const userRouter = express.Router();


//--------------------------------------------------------------------

// Endpoints Implementation

userRouter.options("*", cors.cors, (req, res, next)=>{
    res.sendStatus(200);
});

// login or sign up
userRouter.get("/authenticate", cors.cors, rateLimit, (req, res, next)=>{
    authenticate.authorize(req).then((result)=>{
        let token_ = result.t;
        let admin_ = result.a;
        let prof = result.p
        let exp_ = jwt.decode(token_).exp;

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.json({success: true, status: "user logged in successfully", token: token_, exp: exp_, admin: admin_, profile: prof});
    })
    .catch((err)=>{
        if(err == "invalid"){
            res.statusCode = 401;
            res.setHeader("Content-Type", "application/json");
            res.json({success: false, status: "invalid token"});
        }
        else if(err == "expired"){
            res.statusCode = 401;
            res.setHeader("Content-Type", "application/json");
            res.json({success: false, status: "token expired"});
        }
        else if(err == "revoked"){
            res.statusCode = 401;
            res.setHeader("Content-Type", "application/json");
            res.json({success: false, status: "token revoked"});
        }
        else{
            console.log("Error from /authenticate: ", err);
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.json({success: false, status: "process failed"});
        }
    })
});


// give points to the user who has logged in using his mobile phone (ONE TIME ONLY)
userRouter.put("/login/mobile", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
    USER.findOne({_id: req.user._id}).then((user)=>{
        if(user){
            if(!(user.loggedInUsingMobile)){
                user.loggedInUsingMobile = true;
                user.comPoints += parseInt((process.env.POINTS_FOR_SIGNING_IN_WITH_MOBILE || config.POINTS_FOR_SIGNING_IN_WITH_MOBILE));
                user.save().then((user)=>{
                    res.statusCode = 200;
                    res.setHeader("Content-Type", "application/json");
                    res.json({success: true, status: "points added successfully"});
                })
                .catch((err)=>{
                    console.log("Error from /authenticate/mobile: ", err);
                    res.statusCode = 500;
                    res.setHeader("Content-Type", "application/json");
                    res.json({success: false, status: "process failed"});
                });
            }
            else{
                res.statusCode = 400;
                res.setHeader("Content-Type", "application/json");
                res.json({success: true, status: "user already logged in using mobile before"});
            }
        }
        else{
            res.statusCode = 404;
            res.setHeader("Content-Type", "application/json");
            res.json({success: false, status: "you do not exist in the system"});
        }
    })
    .catch((err)=>{
        console.log("Error from /authenticate/mobile: ", err);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.json({success: false, status: "process failed"});
    });
});



// logout from all devices
userRouter.get("/logout", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
    authenticate.revoke(req.user.uid).then(()=>{
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.json({success: true, status: "user logged out successfully"});
    })
    .catch((err)=>{
        if(err == "not found"){
            res.statusCode = 404;
            res.setHeader("Content-Type", "application/json");
            res.json({success: false, status: "user not found"});
        }
        else{
            console.log("Error from /logout: ", err);
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.json({success: false, status: "process failed"});
        }
    });
});


// get my profile
userRouter.get("/profile", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
    USER.findById(req.user._id).then((user)=>{
        let result = {};
        result._id = user._id;
        result.name = user.name;
        result.picture = user.picture;
        result.refCode = user.refCode;
        result.points = user.absPoints + user.comPoints;
        
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.json({success: true, user: result});
    })
    .catch((err)=>{
        console.log("Error from /users/myprofile: ", err);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.json({success: false, status: "process failed"});
    });
});


// get user profile
userRouter.get("/:userId/profile", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
    USER.findById(req.params.userId).then((user)=>{
        if(!user){
            res.statusCode = 404;
            res.setHeader("Content-Type", "application/json");
            res.json({success: false, status: "user not found"});
        }
        else{
            let result = {};
            result._id = user._id;
            result.name = user.name;
            result.picture = user.picture;
            result.points = user.absPoints + user.comPoints;

            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.json({success: true, user: result});
        }
    })
    .catch((err)=>{
        console.log("Error from /users/:userId/profile: ", err);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.json({success: false, status: "process failed"});
    });
});


// get my owned phones
userRouter.get("/phones", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
    let itemsPerRound = parseInt((process.env.OWNED_PHONES_PER_ROUND || config.OWNED_PHONES_PER_ROUND));
    let roundNum = req.query.round;

    if(roundNum == null || isNaN(roundNum)){
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.json({success: false, status: "bad request"});
        return;
    }

    OWNED_PHONE.find({user: req.user._id})
    .sort({ownedAt: -1})
    .skip((roundNum - 1) * itemsPerRound)
    .limit(itemsPerRound)
    .populate("phone", {name: 1})
    .then((phones)=>{
        let result = [];
        for(let phone of phones){
            result.push({
                _id: phone.phone._id,
                name: phone.phone.name,
                type: "phone"
            });
        }
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.json({success: true, phones: result});
    })
    .catch((err)=>{
        console.log("Error from /users/:userId/profile: ", err);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.json({success: false, status: "process failed"});
    });
});



// get user's owned phones
userRouter.get("/:userId/phones", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
    let itemsPerRound = parseInt((process.env.OWNED_PHONES_PER_ROUND || config.OWNED_PHONES_PER_ROUND));
    let roundNum = req.query.round;

    if(roundNum == null || isNaN(roundNum)){
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.json({success: false, status: "bad request"});
        return;
    }

    OWNED_PHONE.find({user: req.params.userId})
    .sort({ownedAt: -1})
    .skip((roundNum - 1) * itemsPerRound)
    .limit(itemsPerRound)
    .populate("phone", {name: 1})
    .then((phones)=>{
        let result = [];
        for(let phone of phones){
            result.push({
                _id: phone.phone._id,
                name: phone.phone.name,
                type: "phone"
            });
        }
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.json({success: true, phones: result});
    })
    .catch((err)=>{
        console.log("Error from /users/:userId/profile: ", err);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.json({success: false, status: "process failed"});
    });
});




module.exports = userRouter;