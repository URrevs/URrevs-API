/*
  Author: Abdelrahman Hany
  Created on: 8-Apr-2022
*/

const express = require('express');
const targetsRouter = express.Router();


const COMPANY = require("../models/company");
const NEWPHONE = require("../models/newPhone");
const PHONE = require("../models/phone");
const PSPECS = require("../models/phoneSpecs");
const UPDATE = require("../models/update");

const updateData = require("../utils/updateData");

// update data from source, document the update operation
targetsRouter.get("/update", (req,res,next)=>{
  let canUpdate = false;
  UPDATE.find({}).sort({createdAt: -1}).limit(1).then((latestUpdate)=>{
    if(latestUpdate.length == 0){
      canUpdate = true;
    }
    else if(latestUpdate.length > 0){
      if(latestUpdate[0].isUpdating){
        res.statusCode = 404;
        res.setHeader("Content-Type", "application/json");
        res.json(
          {
            success: false,
            status: "there is a running update operation right now"
          });
      }
      else{
        canUpdate = true;
      }
    }
    if(canUpdate){
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.json({success: true, status: "update operation is triggered successfully"});
      console.log("Beginning of update process..............................");
      updateData.updatePhonesFromSource(COMPANY, PHONE, PSPECS, NEWPHONE, UPDATE).then((newItems)=>{
        console.log("End of update process (SUCCESS)..........................");
      })
      .catch((errWithItems)=>{
        console.log("End of update process (FAILURE)..........................");
        console.log(errWithItems.err);
      });
    }
  })
  .catch((err)=>{
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.json({success: false, status: "process failed"});
  });
});


// get the info of the latest update operation (icluding current update)
targetsRouter.get("/update/latest", (req, res, next)=>{
  UPDATE.find({}).sort({createdAt: -1}).limit(1).populate("companies._id","name").populate("phones._id", "name").then((operation)=>{
    if(operation.length > 0){
      let compList = [];
      let pList = [];
      let op = operation[0];
      
      for(let comp of op.companies){
        compList.push(comp._id);
      }

      for(let p of op.phones){
        pList.push(p._id);
      }

      let d = op.createdAt;
      let updating = op.isUpdating;
      let failure = op.failed;
      
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.json(
        {
          success: true, 
          phones: pList, companies: compList,
          numPhones: pList.length,
          numCompanies: compList.length,
          date: d,
          isUpdating: updating,
          failed: failure
        });
    }
    else{
      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json");
      res.json({success: false, status: "no update operations yet"});
    }
  })
  .catch((err)=>{
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.json({success: false, status: "process failed"});
  });
});


module.exports = targetsRouter;
