/*
  Author: Abdelrahman Hany
  Created on: 23-Jun-2022
*/

const express = require('express');
const miscRouter = express.Router();

const cors = require("../utils/cors");
const authenticate = require("../utils/authenticate");
const rateLimit = require("../utils/rateLimit/regular");

const COMPANY = require("../models/company");
const PHONE = require("../models/phone");
const PSPECS = require("../models/phoneSpecs");
const NPHONE = require("../models/newPhone");

const mongoose = require("mongoose");

// preflight
miscRouter.options("*", cors.cors, (req, res, next)=>{
    res.sendStatus(200);
});



// manual phone addition
miscRouter.post("/phone", cors.cors, rateLimit, authenticate.verifyUser, authenticate.verifyAdmin ,(req, res, next)=>{
  const {
    // string
    name, picture, network, sim, screenType, screenProtection, os, chipset, cpu, gpu, exMem, mainCam, selfieCam, wlan, radio, usbType, fingerprintDetails, gps,
    // mongoDB id
    company,
    // numerical string
    price, length, width, height, weight, screenSize, screen2bodyRatio, resolutionLength, resolutionWidth, resolutionDensity, bluetoothVersion, usbVersion, batteryCapacity, chargingPower,
    // date string
    releaseDate,
    // array of strings
    intMem,
    // boolean
    hasLoudspeaker, hasStereo, has3p5mm, hasNfc, hasGyro, hasProximity, hasFastCharging,   
  } = req.body;

  // check if all required fields are provided
  if(name === null || picture === null || network === null || sim === null || screenType === null || screenProtection === null || os === null || chipset === null || cpu === null || gpu === null || exMem === null || mainCam === null || selfieCam === null || wlan === null || radio === null || usbType === null || fingerprintDetails === null || gps === null || company === null || price === null || length === null || width === null || height === null || weight === null || screenSize === null || screen2bodyRatio === null || resolutionLength === null || resolutionWidth === null || resolutionDensity === null || bluetoothVersion === null || usbVersion === null || batteryCapacity === null || chargingPower === null || releaseDate === null || intMem === null || hasLoudspeaker === null || hasStereo === null || has3p5mm === null || hasNfc === null || hasGyro === null || hasProximity === null || hasFastCharging === null){
    return res.status(400).json({
      success: false,
      status: "Missing fields"
    });
  }

  // check if the required fields are of the correct type
  
  if(typeof name !== "string" || typeof picture !== "string" || typeof network !== "string" || typeof gps !== "string"|| typeof sim !== "string" || typeof screenType !== "string" || typeof screenProtection !== "string" || typeof os !== "string" || typeof chipset !== "string" || typeof cpu !== "string" || typeof gpu !== "string" || typeof exMem !== "string" || typeof mainCam !== "string" || typeof selfieCam !== "string" || typeof wlan !== "string" || typeof radio !== "string" || typeof usbType !== "string" || typeof fingerprintDetails !== "string") {
    return res.status(400).json({
        success: false,
        status: "some of the string fields are not strings"
    });
  }

  if(mongoose.Types.ObjectId.isValid(company) !== true) {
    return res.status(400).json({
        success: false,
        status: "company is not a valid mongoDB id"
    });
  }

  if(isNaN(price) || isNaN(length) || isNaN(width) || isNaN(height) || isNaN(weight) || isNaN(screenSize) || isNaN(screen2bodyRatio) || isNaN(resolutionLength) || isNaN(resolutionWidth) || isNaN(resolutionDensity) || isNaN(bluetoothVersion) || isNaN(usbVersion) || isNaN(batteryCapacity) || isNaN(chargingPower)) {
    return res.status(400).json({
        success: false,
        status: "some of the numerical fields are not numerical strings"
    });
  }

  if(!Date.parse(releaseDate)) {
    return res.status(400).json({
        success: false,
        status: "releaseDate is not a valid date"
    });
  }

  if(Array.isArray(intMem) !== true) {
    return res.status(400).json({
        success: false,
        status: "intMem is not an array"
    });
  }
  else{
    for(let i = 0; i < intMem.length; i++) {
      if(typeof intMem[i] !== "string") {
        return res.status(400).json({
            success: false,
            status: "some of the intMem fields are not strings"
        });
      }
    }
  }

  if(typeof hasLoudspeaker !== "boolean" || typeof hasStereo !== "boolean" || typeof has3p5mm !== "boolean" || typeof hasNfc !== "boolean" || typeof hasGyro !== "boolean" || typeof hasProximity !== "boolean" || typeof hasFastCharging !== "boolean") {
    return res.status(400).json({
        success: false,
        status: "some of the boolean fields are not booleans"
    });
  }

  // check if the company exists and if the phone already exists
  let p = [];
  p.push(COMPANY.findById(company, {name: 1}));
  p.push(PHONE.findOne({name: name, company: company}, {_id: 1}));
  Promise.all(p)
  .then((results) => {
    const company = results[0];
    const phone = results[1];

    if(!company) {
      return res.status(404).json({
        success: false,
        status: "company not found"
      });
    }

    if(phone){
      return res.status(403).json({
        success: false,
        status: "phone already exists"
      });
    }

    // create new phone
    PHONE.create({name: name, company: company._id, picture: picture, manual: true}).then((newPhone)=>{
      let proms = [];

      // parsing the fields for PSPECS collections
      
      let sensors = "";
      if(fingerprintDetails){
        sensors += fingerprintDetails;
      }
      if(hasGyro) {
        if(sensors.length > 0) {
          sensors += ", ";
        }
        sensors += "Gyro";
      }
      if(hasProximity) {
        if(sensors.length > 0) {
          sensors += ", ";
        }
        sensors += "Proximity";
      }

      let charging = "";
      if(hasFastCharging) {
        charging += "Fast charging";
      }
      if(chargingPower) {
        if(charging.length > 0) {
          charging += ", ";
        }
        charging += chargingPower + "W";
      }

      let usb = "";
      if(usbType) {
        usb += usbType;
      }
      if(usbVersion) {
        if(usb.length > 0) {
          usb += " ";
        }
        usb += usbVersion;
      }

      let screenS = "";
      if(screenSize) {
        screenS += screenSize + " inches";
      }
      if(screen2bodyRatio) {
        if(screenS.length > 0) {
          screenS += ", ";
        }
        screenS += "(~" + screen2bodyRatio + "% screen-to-body ratio)";
      }

      let screenR = "";
      if(resolutionLength && resolutionWidth) {
        screenR += resolutionLength + " x " + resolutionWidth + " pixels";
      }
      if(resolutionDensity) {
        if(screenR.length > 0) {
          screenR += ", ";
        }
        screenR += "(~" + resolutionDensity + " ppi density)";
      }

      let dimensions = "";
      if(length && width && height) {
        dimensions += length + " x " + width + " x " + height + " mm";
      }

      let weightString = "";
      if(weight) {
        weightString += weight + " g";
      }

      proms.push(PSPECS.create({
        _id: newPhone._id,
        price: (price)? parseFloat(price): null,
        releaseDate: releaseDate,
        dimensions: dimensions,
        newtork: network,
        weight: weightString,
        sim: sim,
        screenType: screenType,
        screenSize: screenS,
        screenResolution: screenR,
        screenProtection: screenProtection,
        os: os,
        chipset: chipset,
        cpu: cpu,
        gpu: gpu,
        exMem: exMem,
        intMem: (intMem.length > 0) ? intMem.join(", ") : "",
        mainCam: mainCam,
        selfieCam: selfieCam,
        loudspeaker: (hasLoudspeaker ? "Yes" : ""),
        slot3p5mm: (has3p5mm ? "Yes" : ""),
        wlan: wlan,
        bluetooth: bluetoothVersion,
        gps: gps,
        nfc: (hasNfc ? "Yes" : ""),
        radio: radio,
        usb: usb,
        sensors: sensors,
        battery: (batteryCapacity)? batteryCapacity + " mAh battery" : "",
        charging: charging
      }));

      proms.push(NPHONE.create({
        _id: newPhone._id,
        price: (price)? parseFloat(price): null,
        name: name,
        company: company.name,
        releaseDate: releaseDate,
        length: length,
        width: width,
        height: height,
        network: network,
        weight: weight,
        sim: sim,
        screenType: screenType,
        screenSize: screenSize,
        screen2bodyRatio: screen2bodyRatio,
        resolutionLength: resolutionLength,
        resolutionWidth: resolutionWidth,
        resolutionDensity: resolutionDensity,
        screenProtection: screenProtection,
        os: os,
        chipset: chipset,
        cpu: cpu,
        gpu: gpu,
        intMem: intMem, // array
        mainCam: mainCam,
        selfieCam: selfieCam,
        hasLoudspeaker: hasLoudspeaker, // boolean
        hasStereo: hasStereo, // boolean
        has3p5mm: has3p5mm, // boolean
        wlan: wlan,
        bluetoothVersion: bluetoothVersion,
        hasNfc: hasNfc, // boolean
        radio: radio,
        usbType: usbType,
        usbVersion: usbVersion,
        hasGyro: hasGyro, // boolean
        hasProximity: hasProximity, // boolean
        fingerprintDetails: fingerprintDetails,
        batteryCapacity: batteryCapacity,
        hasFastCharging: hasFastCharging, // boolean
        chargingPower: (chargingPower)? chargingPower : "0"
      }));


      Promise.all(proms)
      .then((results) => {
        return res.status(200).json({
          success: true,
          _id: newPhone._id
        });
      })
      .catch((err) => {
        console.log("Error from POST /misc/phone: " + err);
        return res.status(500).json({
          success: false,
          status: "error creating phone"
        });
      });

    })
    .catch((err)=>{
      console.log("Error from POST /misc/phone: " + err);
      return res.status(500).json({
        success: false,
        status: "error creating phone"
      });
    });    
  })
  .catch((err) => {
    console.log("Error from POST /misc/phone: " + err);
    return res.status(500).json({
        success: false,
        status: "error finding the phone or company"
    });
  });
});



module.exports = miscRouter;