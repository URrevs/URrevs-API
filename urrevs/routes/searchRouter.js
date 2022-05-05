/*
  Author: Abdelrahman Hany
  Created on: 28-Apr-2022
*/

const express = require("express");

const rateLimitSearch = require("../utils/rateLimit/search");
const rateLimit = require("../utils/rateLimit/regular");
const cors = require("../utils/cors");
const authenticate = require("../utils/authenticate");
const addToRecentSearches = require("../utils/addToRecentSearches");

const PHONE = require("../models/phone");
const COMPANY = require("../models/company");
const UPRODUCT = require("../models/uproducts");
const config = require("../config");

const searchRouter = express.Router();

const phonesSearchLimit = parseInt(process.env.PHONES_SEARCH_LIMIT || config.PHONES_SEARCH_LIMIT);
const productsSearchLimitPhones = parseInt(process.env.PRODUCTS_SEARCH_LIMIT_PHONES || config.PRODUCTS_SEARCH_LIMIT_PHONES);
const globalSearchLimitPhones = parseInt(process.env.GLOBAL_SEARCH_LIMIT_PHONES || config.GLOBAL_SEARCH_LIMIT_PHONES);
const globalSearchLimitCompanies = parseInt(process.env.GLOBAL_SEARCH_LIMIT_COMPANIES || config.GLOBAL_SEARCH_LIMIT_COMPANIES);

//--------------------------------------------------------------------

searchRouter.options("*", cors.cors, (req, res, next)=>{
  res.sendStatus(200);
});

// Endpoints Implementation

// search phones only
searchRouter.get("/products/phones", cors.cors, rateLimitSearch, (req, res, next)=>{
  let searchWord = req.query.q;
  if(!searchWord){
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.json({success: false, status: "bad request"});
    return;
  }

  // SEARCHWORD PROCESSING BEGINS HERE

  searchWord = searchWord.trim();
  
  // replace multiple spaces with single space then convert to array
  searchWord = searchWord.replace(/\s+/g, " "); 
  searchWord = searchWord.split(" ");
  
  // add braces to each word in search word then join the words together
  searchWord = searchWord.map((word)=>{
    word = "[{(" + word + ")}]";
    return word;
  });
  searchWord = searchWord.join(" ");
  
  // escaping special characters
  searchWord = searchWord.replace(/[\[\]\\^$*+?.()|{}]/g, "\\$&");

  // replace any space with any number of spaces
  searchWord = searchWord.replace(/\s+/g, "\\s*"); 

  // allowing any number of round brackets
  searchWord = searchWord.replace(/\(/g, "(*");
  searchWord = searchWord.replace(/\)/g, ")*");

  // allowing any number of square brackets
  searchWord = searchWord.replace(/\[/g, "[*");
  searchWord = searchWord.replace(/\]/g, "]*");

  // allowing any number of curly brackets
  searchWord = searchWord.replace(/\{/g, "{*");
  searchWord = searchWord.replace(/\}/g, "}*");

  // SEARCHWORD PROCESSING ENDS HERE

  PHONE.find({name: {$regex: searchWord, $options: "i"}}, {name: 1}).limit(phonesSearchLimit).then((phones)=>{
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



// search all products (No companies)
searchRouter.get("/products", cors.cors, rateLimitSearch, (req, res, next)=>{
  let searchWord = req.query.q;
  if(!searchWord){
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.json({success: false, status: "bad request"});
    return;
  }
  
    // SEARCHWORD PROCESSING BEGINS HERE

    searchWord = searchWord.trim();
  
    // replace multiple spaces with single space then convert to array
    searchWord = searchWord.replace(/\s+/g, " "); 
    searchWord = searchWord.split(" ");
    
    // add braces to each word in search word then join the words together
    searchWord = searchWord.map((word)=>{
      word = "[{(" + word + ")}]";
      return word;
    });
    searchWord = searchWord.join(" ");
    
    // escaping special characters
    searchWord = searchWord.replace(/[\[\]\\^$*+?.()|{}]/g, "\\$&");
  
    // replace any space with any number of spaces
    searchWord = searchWord.replace(/\s+/g, "\\s*"); 
  
    // allowing any number of round brackets
    searchWord = searchWord.replace(/\(/g, "(*");
    searchWord = searchWord.replace(/\)/g, ")*");
  
    // allowing any number of square brackets
    searchWord = searchWord.replace(/\[/g, "[*");
    searchWord = searchWord.replace(/\]/g, "]*");
  
    // allowing any number of curly brackets
    searchWord = searchWord.replace(/\{/g, "{*");
    searchWord = searchWord.replace(/\}/g, "}*");
  
    // SEARCHWORD PROCESSING ENDS HERE 

  let promises = [];
  // push promises for other products here
  promises.push(PHONE.find({name: {$regex: searchWord, $options: "i"}}, {name: 1}).limit(productsSearchLimitPhones));

  Promise.all(promises).then((results)=>{
    let phonesRes = results[0];
    let phones = [];
    
    for(p of phonesRes){
      phones.push({
        _id: p._id,
        name: p.name,
        type: "phone"
      });
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.json({success: true, phones: phones});
  })
  .catch((err)=>{
    console.log("Error from /search/products: ", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.json({success: false, status: "process failed"});
  });
});



// search all products and companies
searchRouter.get("/all", cors.cors, rateLimitSearch, (req, res, next)=>{
  let searchWord = req.query.q;
  if(!searchWord){
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.json({success: false, status: "bad request"});
    return;
  }
  
    // SEARCHWORD PROCESSING BEGINS HERE

    searchWord = searchWord.trim();
  
    // replace multiple spaces with single space then convert to array
    searchWord = searchWord.replace(/\s+/g, " "); 
    searchWord = searchWord.split(" ");
    
    // add braces to each word in search word then join the words together
    searchWord = searchWord.map((word)=>{
      word = "[{(" + word + ")}]";
      return word;
    });
    searchWord = searchWord.join(" ");
    
    // escaping special characters
    searchWord = searchWord.replace(/[\[\]\\^$*+?.()|{}]/g, "\\$&");
  
    // replace any space with any number of spaces
    searchWord = searchWord.replace(/\s+/g, "\\s*"); 
  
    // allowing any number of round brackets
    searchWord = searchWord.replace(/\(/g, "(*");
    searchWord = searchWord.replace(/\)/g, ")*");
  
    // allowing any number of square brackets
    searchWord = searchWord.replace(/\[/g, "[*");
    searchWord = searchWord.replace(/\]/g, "]*");
  
    // allowing any number of curly brackets
    searchWord = searchWord.replace(/\{/g, "{*");
    searchWord = searchWord.replace(/\}/g, "}*");
  
    // SEARCHWORD PROCESSING ENDS HERE

  let promises = [];
  promises.push(PHONE.find({name: {$regex: searchWord, $options: "i"}}, {name: 1}).limit(globalSearchLimitPhones));
  promises.push(COMPANY.find({nameLower: {$regex: searchWord, $options: "i"}}, {name: 1}).limit(globalSearchLimitCompanies));

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



// add a new search result to recent searches
searchRouter.put("/recent", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
  // checking if the body is valid
  if(!(req.body.type && req.body._id)){
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.json({success: false, status: "bad request"});
      return;
  }
  // if the type is valid, continue. Otherwise, bad request
  if(req.body.type == "phone" || req.body.type == "company"){
    let collection;
    let type;
    let onModel;
    // configuring the collection, the type and the model
    if(req.body.type == "phone"){
      collection = PHONE;
      type = "phone";
      onModel = "Phone";  
    }
    else if(req.body.type == "company"){
      collection = COMPANY;
      type = "company";
      onModel = "Company";  
    }
    // finding the recent searches for the user
    UPRODUCT.findOne({_id: req.user._id}).then((uproduct)=>{
      if(!uproduct){
        // if the user has no recent searches, create the document
        UPRODUCT.create({_id: req.user._id}).then((uproduct)=>{
          // add the new search result to the recent searches
          addToRecentSearches(collection, req.body._id, type, onModel, uproduct)
          .then((result)=>{
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.json({success: true, status: "result added successfully"});
          })
          .catch((err)=>{
            if(err == 404){
              res.statusCode = 404;
              res.setHeader("Content-Type", "application/json");
              res.json({success: false, status: "item not found"});
            }
            else{
              console.log("Error from POST /search/recent: ", err);
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.json({success: false, status: "process failed"});
            }
          });
        })
        .catch((err)=>{
          console.log("Error from /search/recent: ", err);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.json({success: false, status: "process failed"});
        })
      }
      else if(uproduct.recentSearches.id(req.body._id)){
        // if the search result already exists, stop. Otherwise, add it
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.json({success: true, status: "result already exists"});
        return;
      }
      else{
        addToRecentSearches(collection, req.body._id, type, onModel, uproduct)
        .then((result)=>{
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.json({success: true, status: "result added successfully"});
        })
        .catch((err)=>{
          if(err == 404){
            res.statusCode = 404;
            res.setHeader("Content-Type", "application/json");
            res.json({success: false, status: "item not found"});
          }
          else{
            console.log("Error from POST /search/recent: ", err);
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.json({success: false, status: "process failed"});
          }
        });
      }
    })
    .catch((err)=>{
      console.log("Error from /search/recent: ", err);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.json({success: false, status: "process failed"});
      return;
    });
  }
  else{
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.json({success: false, status: "bad request"});
    return;
  }
});


// get my recent searches
searchRouter.get("/recent", cors.cors, rateLimitSearch, authenticate.verifyUser, (req, res, next)=>{
  UPRODUCT.findOne({_id: req.user._id}, {recentSearches: 1}).populate("recentSearches._id", {name: 1}).then((user)=>{
    
    // if the user has no recent searches, create the document
    if(!user){
      UPRODUCT.create({_id: req.user._id}).then((user)=>{
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.json({success: true, recent: user.recentSearches});
      });
      return;
    }

    let searches = [];
    for(s of user.recentSearches){
      searches.push({
        _id: s._id._id,
        name: s._id.name,
        type: s.type
      });
    }
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.json({success: true, recent: searches});
  })
  .catch((err)=>{
    console.log("Error from GET /search/recent: ", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.json({success: false, status: "process failed"});
  });
});


// delete a recent search result
searchRouter.delete("/recent", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
  if(!(req.body._id)){
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.json({success: false, status: "bad request"});
    return;
  }
  // delete a certain search result given its id
  UPRODUCT.findOneAndUpdate({_id: req.user._id}, {$pull: {recentSearches: {_id: req.body._id}}}).then((user)=>{
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.json({success: true, status: "result deleted successfully"});
  })
  .catch((err)=>{
    console.log("Error from DELETE /search/recent: ", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.json({success: false, status: "process failed"});
  })
});

module.exports = searchRouter;