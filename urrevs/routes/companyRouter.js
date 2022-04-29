/*
  Author: Abdelrahman Hany
  Created on: 29-Apr-2022
*/

const express = require("express");
const companyRouter = express.Router();

const cors = require("../utils/cors");
const rateLimit = require("../utils/rateLimit");

const COMPANY = require("../models/company");

//--------------------------------------------------------------------

// Endpoints Implementation


// get statistical info about a company
companyRouter.get("/:companyId/stats", rateLimit.regular, cors.cors, (req, res, next)=>{
    COMPANY.findById(req.params.companyId).then((company)=>{
        if(!company){
            res.statusCode = 404;
            res.setHeader("Content-Type", "application/json");
            res.json({success: false, status: "company not found"});
            return; 
        }
        
        // increase the view count
        if(company.views){
            company.views += 1;
        }else{
            company.views = 1;
        }

        company.save().then((company)=>{
            let result = {};
            result._id = company._id;
            result.name = company.name;
            result.type = "company";
            result.views = company.views;
            result.rating = company.avgRating;

            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.json({success: true, stats: result});
        })
        .catch((err)=>{
            console.log("Error from /:companyId/stats: ", err);
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.json({success: false, status: "process failed"});
        });
    })
    .catch((err)=>{
        console.log("Error from /:companyId/stats: ", err);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.json({success: false, status: "process failed"});
    })
});



// get all companies sorted by total number of reviews on its products
companyRouter.get("/all", rateLimit.regular, cors.cors, (req, res, next)=>{
    let itemsPerRound = parseInt((process.env.ALL_COMPANIES_PER_ROUND|| config.ALL_COMPANIES_PER_ROUND));
    let roundNum = req.query.round;
    
    if(!roundNum){
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.json({success: false, status: "bad request"});
        return;
    }

    COMPANY.find({})
    .sort({totalRevsCount: -1})
    .skip((roundNum - 1) * itemsPerRound)
    .limit(itemsPerRound)
    .then((companies)=>{
        let result = [];
        for(let c of companies){
            result.push({
                _id: c._id,
                name: c.name,
                logo: c.picture,
                type: "company"
            });
        }
        
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.json({success: true, companies: result});
    })
    .catch((err)=>{
        console.log("Error from /companies/all: ", err);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.json({success: false, status: "process failed"});
    });
});

module.exports = companyRouter;