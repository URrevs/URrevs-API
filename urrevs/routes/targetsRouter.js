/*
  Author: Abdelrahman Hany
  Created on: 8-Apr-2022
*/

const express = require('express');
const targetsRouter = express.Router();


const COMPANY = require("../models/company");
const newPhone = require('../models/newPhone');
const NEWPHONE = require("../models/newPhone");
const PHONE = require("../models/phone");
const PSPECS = require("../models/phoneSpecs");
const UPDATE = require("../models/update");

const updateData = require("../utils/updateData");


// stores new brands in the database and sends them to client
targetsRouter.get("/brands/update", (req,res,next)=>{

  updateData.updateCompaniesFromSource(COMPANY).then((companies)=>{
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.json({
      success: true, 
      numAddedCompanies: companies.length,
      addedCompanies: companies
    });
  })
  .catch((err)=>{
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.json({success: false, err: err});
  });
});

// sends a list of names and endpoints for each brand
targetsRouter.get("/brands/endpoints", (req,res,next)=>{

  updateData.getBrandsLinks().then((urls)=>{
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.json({success: true, num: urls.length ,urls: urls});
  })
  .catch((err)=>{
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.json({success: false, err: err});
  });
});


/*
  given the name of a company
  given the endpoint of that company

  returns an error if the company name is not given

  it searches the companies for that company
  if found, it loads its profile
  if not, a new profile is created for that company and then used in the next steps

  it searches the phones for the most recently-added phone which corresponds to that company
  if found, it loads its name to pass to the "update" function
  if not, we pass a null to the "update" function

  the "update" function returns the newly added phones for that company
  it returns the full phone profile for the newly added phones
*/
targetsRouter.get("/brands/:url", (req,res,next)=>{
  let url = req.params.url;
  let brandName = req.query.bname;
  if(!brandName){
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.json({success: false, err: "bad request"});
  }
  else{
    brandName = brandName.trim();
    COMPANY.findOne({name: new RegExp(brandName, "i") }).then(async(result)=>{
      let brand = result;
      if(!brand){
        try{
          let newBrand = await COMPANY.create({name: brandName});
          brand = newBrand;
        }
        catch(err){
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.json({success: false, err: err});
        }
      }
      PHONE.find({company: brand._id}, {name:1, _id: 0}).sort({createdAt: -1}).limit(1).then((latest)=>{
        //console.log(latest[0].name);
        updateData.updatePhonesFromSource(url, (latest.length > 0)?latest[0].name:null, brand, PHONE).then((newPhones)=>{
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.json({success: true, num: newPhones.length ,phones: newPhones});
        })
        .catch((errWithPhones)=>{
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.json({success: false, num:errWithPhones.phones.length, phones: errWithPhones.phones, err: errWithPhones.err});
        });
      })
      .catch((err)=>{
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.json({success: false, err: err});
      });
    })
    .catch((err)=>{
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.json({success: false, err: err});
    });
  }
});


targetsRouter.get("/brands/specs/:url", async(req, res, next)=>{
  const axios = require("axios");
  const cheerio = require("cheerio");
  const SOURCE = "https://www.gsmarena.com";
  const EUR_TO_USD = 1.0878;
  let sepcsResponse = await axios.get(SOURCE + '/' + req.params.url);
  $ = cheerio.load(sepcsResponse.data);
  
  // gathering specs
  let specNode = $('table');
  let spec_detail = []
  specNode.each((i, el) => {
      let specList = []
      let category = $(el).find('th').text().trim();
      let specN = $(el).find('tr')
      specN.each((index, ele) => {
          let a = {
              name: $('td.ttl', ele).text().trim(),
              value: $('td.nfo', ele).text().trim()
          }
          specList.push(a)
      });
      spec_detail.push({
          category: category,
          specs: specList
      });
  });

  // declaring vars
  let networkTech, 
  launchReleaseDate, 
  bodyDimensions, bodyWeight, bodySim, 
  displayType, displaySize, displayResolution, displayProtection,
  platformOs, platformChipset, platformCpu, platformGpu,
  memoryCardSlot, memoryInternal,
  mainCameraTypeSpaceDetails,
  selfieCameraTypeSpaceDetails,
  soundLoudSpeaker, sound3p5mm,
  commsWlan, commsBluetooth, commsGps, commsNfc, commsRadio, commsUsb,
  featuresSensors,
  batteryType, batteryCharging, 
  miscPrice;

  // Apply checks over the phone specs
  //-------------------------------------

  /*
    refuse the phones that are not in the market
    current conditions:
      1- Status contains "Available" or "Discontinued"
      2- Announced is not "Not officially announced yet"
    if the field "Launch" "Launch: Announced" or "Launch: Status" don't exist, refuse the phone
  */
  try{
    let launchInfo = spec_detail.filter((item)=>{
      return item.category == "Launch";
    });
    let launchAvailability =  launchInfo[0].specs.filter((item)=>{
      return item.name == "Status";
    });
    
    // only include "Available" and "Discontinuous" status in launch
    if(!(launchAvailability[0].value.match(new RegExp("Available")) || launchAvailability[0].value.match(new RegExp("Discontinued")))){
      // res.setHeader("Content-Type", "application/json");
      // res.json({status: "skipped"});
      // continue;
    }
    
    let launchAnnouncement =  launchInfo[0].specs.filter((item)=>{
      return item.name == "Announced";
    });
    if(launchAnnouncement[0].value.match(new RegExp("Not officially announced yet"))){
      // continue;
    }
  }
  catch(e){
    // continue;
  }


  /*
    only inlude the following:
      3.5 < screen size < 7
      7 <= screen size <= 8.1  and  screen to body ratio >= 77
      screen to body ratio >= 140
    if "Display" or "Display: Size" don't exist, refuse the phone
  */
  try{
    let displayInfo = spec_detail.filter((item)=>{
      return item.category == "Display";
    });
    let displaySizeObj = displayInfo[0].specs.filter((item)=>{
      return item.name == "Size";
    });
    let sizeElements = displaySizeObj[0].value.split(" ");
    let sizeInInches = parseFloat(sizeElements[0]);
    let screenToBodyRatioString = sizeElements[4];
    let screenToBodyRatioElements = screenToBodyRatioString.split(" ");
    let screenToBodyRatio = parseFloat(screenToBodyRatioElements[0].substring(2));
  
    //console.log("size in inches: ", sizeInInches, "\nscreen to body ratio: ", screenToBodyRatio);
    
    /* 
      only inlude the following:
        3.5 < screen size < 7
        7 <= screen size <= 8.1  and  screen to body ratio >= 77
        screen to body ratio >= 140
    */
    if(!
      ((sizeInInches > 3.5 && sizeInInches < 7) || 
      (sizeInInches >= 7 && sizeInInches <= 8.1 && screenToBodyRatio >= 77) ||
      (screenToBodyRatio > 140))){
        // continue;
    }
  }
  catch(e){
    // continue;
  }



  // getting specs of valid phones
  //---------------------------------
  
  // network: technology
  try{
    let network = spec_detail.filter((item)=>{
      return item.category == "Network";
    });
    let networkTechField = network[0].specs.filter((item)=>{
      return item.name == "Technology";
    });
    networkTech = networkTechField[0].value;
  }
  catch(e){
    networkTech = null;
  };

  // release date
  try{
    let release = $('span[data-spec=released-hl]').text();
    release = release.trim();
    let releaseArr = release.split(" ");
    releaseArr.shift();
    launchReleaseDate = releaseArr.join(" ");
  }
  catch(e){
    launchReleaseDate = null;
  }
  
  // body: weight, dimensions, sim
  try{
    let body = spec_detail.filter((item)=>{
      return item.category == "Body";
    });
    try{
      let allDimesnions = body[0].specs.filter((item)=>{
        return item.name == "Dimensions"; 
      })[0].value;
      allDimesnions = allDimesnions.split(" ").slice(0, 6);
      bodyDimensions = allDimesnions.join(" ");
    }
    catch(e){
      bodyDimensions = null;
    }
    try{
      let allWeight = body[0].specs.filter((item)=>{
        return item.name == "Weight"; 
      })[0].value;
      allWeight = allWeight.split(" ").slice(0, 2);
      bodyWeight = allWeight.join(" ");
    }
    catch(e){
      bodyWeight = null;
    }
    try{
      bodySim = body[0].specs.filter((item)=>{
        return item.name == "SIM"; 
      })[0].value;
    }
    catch(e){
      bodySim = null;
    }
  }
  catch (e){
    bodyDimensions = null;
    bodyWeight = null;
    bodySim = null;
  }

  // display: type, size, resolution, protection
  try{
    let displayInfo = spec_detail.filter((item)=>{
      return item.category == "Display";
    });

    try{
      displayType = displayInfo[0].specs.filter((item)=>{
        return item.name == "Type";
      })[0].value;
    }
    catch(e){
      displayType = null;
    }

    try{
      displayResolution = displayInfo[0].specs.filter((item)=>{
        return item.name == "Resolution";
      })[0].value;
    }
    catch(e){
      displayResolution = null;
    }

    try{
      displayProtection = displayInfo[0].specs.filter((item)=>{
        return item.name == "Protection";
      })[0].value;
    }
    catch(e){
      displayProtection = null;
    }

    try{
      displaySize = displayInfo[0].specs.filter((item)=>{
        return item.name == "Size";
      })[0].value;
    }
    catch(e){
      displaySize = null;
    }
  }
  catch(e){
    displayType = null;
    displayResolution = null;
    displayProtection = null;
    displaySize = null;
  }

  // platform Os, Chipset, Cpu, Gpu,
  try{
    let body = spec_detail.filter((item)=>{
      return item.category == "Platform";
    });
    try{
      platformOs = body[0].specs.filter((item)=>{
        return item.name == "OS"; 
      })[0].value;
    }
    catch(e){
      platformOs = null;
    }
    try{
      platformChipset = body[0].specs.filter((item)=>{
        return item.name == "Chipset"; 
      })[0].value;
    }
    catch(e){
      platformChipset = null;
    }
    try{
      platformCpu = body[0].specs.filter((item)=>{
        return item.name == "CPU"; 
      })[0].value;
    }
    catch(e){
      platformCpu = null;
    }
    try{
      platformGpu = body[0].specs.filter((item)=>{
        return item.name == "GPU"; 
      })[0].value;
    }
    catch(e){
      platformGpu = null;
    } 
  }
  catch (e){
    platformOs = null;
    platformChipset = null;
    platformCpu = null;
    platformGpu = null;
  }

  // memory: CardSlot, Internal
  try{
    let body = spec_detail.filter((item)=>{
      return item.category == "Memory";
    });
    try{
      memoryCardSlot = body[0].specs.filter((item)=>{
        return item.name == "Card slot"; 
      })[0].value;
    }
    catch(e){
      memoryCardSlot = null;
    }
    try{
      memoryInternal = body[0].specs.filter((item)=>{
        return item.name == "Internal"; 
      })[0].value;
    }
    catch(e){
      memoryInternal = null;
    }
  }
  catch (e){
    memoryInternal = null;
    memoryCardSlot = null;
  }


  // main camera: mainCameraTypeSpaceDetails
  try{
    let body = spec_detail.filter((item)=>{
      return item.category == "Main Camera";
    });
    try{
      let cameraType = body[0].specs[0].name;
      let cameraDetails = body[0].specs[0].value;
      mainCameraTypeSpaceDetails = cameraType + " " + cameraDetails;
    }
    catch(e){
      mainCameraTypeSpaceDetails = null;
    }
  }
  catch (e){
    mainCameraTypeSpaceDetails = null;
  }


  // selfie camera: selfieCameraTypeSpaceDetails
  try{
    let body = spec_detail.filter((item)=>{
      return item.category == "Selfie camera";
    });
    try{
      let cameraType = body[0].specs[0].name;
      let cameraDetails = body[0].specs[0].value;
      selfieCameraTypeSpaceDetails = cameraType + " " + cameraDetails;
    }
    catch(e){
      selfieCameraTypeSpaceDetails = null;
    }
  }
  catch (e){
    selfieCameraTypeSpaceDetails = null;
  }

  // sound: LoudSpeaker, 3.5mm,
  try{
    let body = spec_detail.filter((item)=>{
      return item.category == "Sound";
    });
    try{
      soundLoudSpeaker = body[0].specs.filter((item)=>{
        return item.name == "Loudspeaker";
      })[0].value;
    }
    catch(e){
      soundLoudSpeaker = null;
    }
    try{
      sound3p5mm = body[0].specs.filter((item)=>{
        return item.name == "3.5mm jack";
      })[0].value;
    }
    catch(e){
      sound3p5mm = null;
    }
  }
  catch (e){
    soundLoudSpeaker = null;
    sound3p5mm = null;
  }

  // comms: Wlan, Bluetooth, Gps, Nfc, Radio, Usb
  try{
    let body = spec_detail.filter((item)=>{
      return item.category == "Comms";
    });
    try{
      commsWlan = body[0].specs.filter((item)=>{
        return item.name == "WLAN";
      })[0].value;
    }
    catch(e){
      commsWlan = null;
    }
    try{
      commsBluetooth = body[0].specs.filter((item)=>{
        return item.name == "Bluetooth";
      })[0].value;
    }
    catch(e){
      commsBluetooth = null;
    }
    try{
      commsGps = body[0].specs.filter((item)=>{
        return item.name == "GPS";
      })[0].value;
    }
    catch(e){
      commsGps = null;
    }
    try{
      commsNfc = body[0].specs.filter((item)=>{
        return item.name == "NFC";
      })[0].value;
    }
    catch(e){
      commsNfc = null;
    }
    try{
      commsRadio = body[0].specs.filter((item)=>{
        return item.name == "Radio";
      })[0].value;
    }
    catch(e){
      commsRadio = null;
    }
    try{
      commsUsb = body[0].specs.filter((item)=>{
        return item.name == "USB";
      })[0].value;
    }
    catch(e){
      commsUsb = null;
    }
  }
  catch (e){
    commsUsb = null;
    commsRadio = null;
    commsNfc = null;
    commsGps = null;
    commsBluetooth = null;
    commsWlan = null;
  }  

  // features: Sensors
  try{
    let body = spec_detail.filter((item)=>{
      return item.category == "Features";
    });
    try{
      featuresSensors = body[0].specs.filter((item)=>{
        return item.name == "Sensors";
      })[0].value;
    }
    catch(e){
      featuresSensors = null;
    }
  }
  catch (e){
    featuresSensors = null;
  }

  // battery: Type, Charging
  try{
    let body = spec_detail.filter((item)=>{
      return item.category == "Battery";
    });
    try{
      batteryType = body[0].specs.filter((item)=>{
        return item.name == "Type";
      })[0].value;
    }
    catch(e){
      batteryType = null;
    }
    try{
      batteryCharging = body[0].specs.filter((item)=>{
        return item.name == "Charging";
      })[0].value;
    }
    catch(e){
      batteryCharging = null;
    }
  }
  catch (e){
    batteryType = null;
    batteryCharging = null;
  }  

  // MISC: price
  try{
    let body = spec_detail.filter((item)=>{
      return item.category == "Misc";
    });
    try{
      let miscPriceAll = body[0].specs.filter((item)=>{
        return item.name == "Price";
      })[0].value;
      miscPriceAll = miscPriceAll.split(" ");
      miscPrice = miscPriceAll;

      if(miscPriceAll[0] == "About"){
        let currency;
        if(!isNaN(parseFloat(miscPriceAll[1]))){
          currency = miscPriceAll[2];
          if(currency == "EUR"){
            miscPrice = parseFloat(miscPriceAll[1]) * EUR_TO_USD;
          }
        }
        else if(miscPriceAll[1][0] == "$"){
          currency = "usd";
          miscPrice = parseFloat(miscPrice[1].substring(1));
        }
      }
      else{
        if(miscPriceAll[0][0] == "$"){
          miscPrice = parseFloat(miscPriceAll[0].substring(1));
        }
        else if(miscPriceAll[0][0] == "€"){
          miscPrice = parseFloat(miscPriceAll[0].substring(1)) * EUR_TO_USD;
        }
      }
    }
    catch(e){
      miscPrice = null;
    }
  }
  catch (e){
    miscPrice = null;
  }


  // console.log(networkTech);
  // console.log(launchReleaseDate);
  // console.log(bodyDimensions);
  // console.log(bodyWeight); //
  // console.log(bodySim);
  // console.log(displayType);
  // console.log(displaySize);
  // console.log(displayResolution);
  // console.log(displayProtection);
  // console.log("----------------------");
  // console.log(platformOs);
  // console.log(platformChipset);
  // console.log(platformCpu);
  // console.log(platformGpu);
  // console.log("----------------------");
  // console.log(memoryCardSlot);
  // console.log(memoryInternal);
  // console.log("----------------------");
  // console.log(mainCameraTypeSpaceDetails);
  // console.log(selfieCameraTypeSpaceDetails);
  // console.log("----------------------");
  // console.log(soundLoudSpeaker);
  // console.log(sound3p5mm);
  // console.log("----------------------");
  // console.log(commsWlan);
  // console.log(commsBluetooth);
  // console.log(commsGps);
  // console.log(commsNfc);
  // console.log(commsRadio);
  // console.log(commsUsb);
  // console.log("----------------------");
  // console.log(featuresSensors);
  // console.log("----------------------");
  // console.log(batteryType);
  // console.log(batteryCharging);
  // console.log("----------------------");
  // console.log(miscPrice);


});

module.exports = targetsRouter;
