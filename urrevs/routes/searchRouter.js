/*
  Author: Abdelrahman Hany
  Created on: 28-Apr-2022
*/

const express = require("express");

const rateLimit = require("../utils/rateLimit");
const cors = require("../utils/cors");

const PHONE = require("../models/phone");
const COMPANY = require("../models/company");

const searchRouter = express.Router();


//--------------------------------------------------------------------

// Endpoints Implementation

// search phones only
searchRouter.get("/products/phones", rateLimit.search, cors.cors, (req, res, next)=>{
  let searchWord = req.query.q;
  if(!searchWord){
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.json({success: false, status: "bad request"});
    return;
  }

  PHONE.find({name: {$regex: searchWord, $options: "i"}}, {name: 1}).limit(5).then((phones)=>{
    let result = [];
    for(p of phones){
      result.push({
        _id: p._id,
        name: p.name,
        type: "phone"
      });
    }
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.json({success: true, phones: result});
  }).
  catch((err)=>{
    console.log("Error from /products/phones: ", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.json({success: false, status: "process failed"});
  })
});


// search all products and companies
searchRouter.get("/all", rateLimit.search, cors.cors, (req, res, next)=>{
  let searchWord = req.query.q;
  if(!searchWord){
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.json({success: false, status: "bad request"});
    return;
  }
  
  let promises = [];
  promises.push(PHONE.find({name: {$regex: searchWord, $options: "i"}}, {name: 1}).limit(5).exec());
  promises.push(COMPANY.find({nameLower: {$regex: searchWord, $options: "i"}}, {name: 1}).limit(5).exec());

  Promise.all(promises).then((results)=>{
    let phonesRes = results[0];
    let companiesRes = results[1];
    let phones = [];
    let companies = [];
    
    for(p of phonesRes){
      phones.push({
        _id: p._id,
        name: p.name,
        type: "phone"
      });
    }

    for(c of companiesRes){
      companies.push({
        _id: c._id,
        name: c.name,
        type: "company"
      });
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.json({success: true, phones: phones, companies: companies});
  })
  .catch((err)=>{
    console.log("Error from /search/all: ", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.json({success: false, status: "process failed"});
  });
});

module.exports = searchRouter;