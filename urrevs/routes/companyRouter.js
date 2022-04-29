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
        
        let result = {};
        result._id = company._id;
        result.name = company.name;
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
    })
});


module.exports = companyRouter;