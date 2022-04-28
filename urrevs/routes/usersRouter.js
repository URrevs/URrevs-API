/*
  Author: Abdelrahman Hany
  Created on: 28-Apr-2022
*/

const express = require("express");

const rateLimit = require("../utils/rateLimit");
const cors = require("../utils/cors");
const authenticate = require("../utils/authenticate");

const userRouter = express.Router();
userRouter.use(rateLimit);
userRouter.use(cors.cors);

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
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.json({success: false, status: "process failed"});
        }
    })
});




module.exports = userRouter;