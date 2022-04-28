/*
  Author: Abdelrahman Hany
  Created on: 28-Apr-2022
*/

const express = require("express");

const rateLimit = require("../utils/rateLimit");
const cors = require("../utils/cors");
const authenticate = require("../utils/authenticate");

const USER = require("../models/user");
const OWNED_PHONE = require("../models/ownedPhone");

const userRouter = express.Router();

// Applying important middlewares
userRouter.use(rateLimit);
userRouter.use(cors.cors);

//--------------------------------------------------------------------

// Endpoints Implementation



// login or sign up
userRouter.get("/authenticate", (req, res, next)=>{
    authenticate.authorize(req).then((token)=>{
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.json({success: true, status: "user logged in successfully", token: token});
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



// logout from all devices
userRouter.get("/logout", authenticate.verifyUser, (req, res, next)=>{
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
userRouter.get("/myprofile", authenticate.verifyUser, (req, res, next)=>{
    USER.findById(req.user._id).then((user)=>{
        let result = {};
        result._id = user._id;
        result.name = user.name;
        result.picture = user.picture;
        result.refCode = user.refCode;
        result.points = user.absPoints;
        
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
userRouter.get("/:userId/profile", authenticate.verifyUser, (req, res, next)=>{
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
            result.points = user.absPoints;

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
userRouter.get("/myphones", authenticate.verifyUser, (req, res, next)=>{
    let itemsPerRound = 20;
    let roundNum = req.query.round;

    if(roundNum == null){
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
userRouter.get("/:userId/phones", authenticate.verifyUser, (req, res, next)=>{
    let itemsPerRound = 20;
    let roundNum = req.query.round;

    if(roundNum == null){
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