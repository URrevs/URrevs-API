/*
  Author: Abdelrahman Hany
  Created on: 18-May-2022
*/

const express = require("express");
const questionRouter = express.Router();

const cors = require("../utils/cors");
const rateLimit = require("../utils/rateLimit/regular");
const authenticate = require("../utils/authenticate");

const USER = require("../models/user");
const PHONE = require("../models/phone");
const COMPANY = require("../models/company");
const PQUES = require("../models/phoneQuestion");
const PANS = require("../models/phoneAnswer");
const CQUES = require("../models/companyQuestion");
const CANS = require("../models/companyAnswer");



// preflight
questionRouter.options("*", cors.cors, (req, res, next)=>{
    res.sendStatus(200);
});


// add a phone question
/*
  steps:
    1- extract body
    2- check if the content is not empty or only spaces
    3- check if the phone exists
    4- create question
    5- return the question as a response
*/
questionRouter.post("/phone", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
  let {phone, content} = req.body;

  if(!phone || !content){
    return res.status(400).json({
      success: false,
      status: "bad request"
    })
  }

  if(!typeof(content) === "string"){
    return res.status(400).json({
      success: false,
      status: "bad request"
    })
  }

  if(content.trim() == ""){
    return res.status(400).json({
      success: false,
      status: "bad request"
    })
  }

  PHONE.findOne({_id: phone}, {name: 1}).then((phone)=>{
    if(!phone){
      return res.status(404).json({
        success: false,
        status: "phone not found"
      })
    }

    // create the question
    PQUES.create({
      user: req.user._id,
      phone: phone._id,
      content: content
    })
    .then((q)=>{
      let question = {
        _id: q._id,
        type: "phone",
        userId: q.user,
        userName: req.user.name,
        picture: req.user.picture,
        createdAt: q.createdAt,
        phoneId: q.phone,
        phoneName: phone.name,
        content: q.content,
        upvotes: q.upvotes,
        ansCount: q.ansCount,
        shareCount: q.shareCount
      }

      return res.status(200).json({
        success: true,
        question: question
      });
    })
    .catch((err)=>{
      console.log("Error from /questions/phone: ", err);
      return res.status(500).json({
        success: false,
        status: "internal server error",
        err: "creating the question failed"
      })
    })
  })
  .catch((err)=>{
    console.log("Error from /questions/phone: ", err);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: "finding the phone failed"
    })
  })
});






// add a company question
/*
  steps:
    1- extract body
    2- check if the content is not empty or only spaces
    3- check if the company exists
    4- create question
    5- return the question as a response
*/
questionRouter.post("/company", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
  let {company, content} = req.body;

  if(!company || !content){
    return res.status(400).json({
      success: false,
      status: "bad request"
    })
  }

  if(!typeof(content) === "string"){
    return res.status(400).json({
      success: false,
      status: "bad request"
    })
  }

  if(content.trim() == ""){
    return res.status(400).json({
      success: false,
      status: "bad request"
    })
  }

  COMPANY.findOne({_id: company}, {name: 1}).then((company)=>{
    if(!company){
      return res.status(404).json({
        success: false,
        status: "company not found"
      })
    }

    // create the question
    CQUES.create({
      user: req.user._id,
      company: company._id,
      content: content
    })
    .then((q)=>{
      let question = {
        _id: q._id,
        type: "company",
        userId: q.user,
        userName: req.user.name,
        picture: req.user.picture,
        createdAt: q.createdAt,
        companyId: q.company,
        companyName: company.name,
        content: q.content,
        upvotes: q.upvotes,
        ansCount: q.ansCount,
        shareCount: q.shareCount
      }

      return res.status(200).json({
        success: true,
        question: question
      });
    })
    .catch((err)=>{
      console.log("Error from /questions/company: ", err);
      return res.status(500).json({
        success: false,
        status: "internal server error",
        err: "creating the question failed"
      })
    })
  })
  .catch((err)=>{
    console.log("Error from /questions/company: ", err);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: "finding the company failed"
    })
  })
});







module.exports = questionRouter