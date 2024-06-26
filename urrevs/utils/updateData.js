const cheerio = require('cheerio');
const axios = require('axios');
const request = require("request");
const config = require("../config");
const https = require("https");
const CONSTANT = require("../models/constants");


// from dollar to euro
const convertFromUSDtoEUR = async(conversion, backup)=>{
  if(!conversion){
    // Get latest conversions from USD to EUR
    let TIMEOUT = parseInt(process.env.TIMEOUT) || config.TIMEOUT;
    let rates, oneEur, oneUsd, usdToeur;
    try{
      const {data: exRates} = await axios.get(config.EXCHANGE_RATES_API+"/latest", {params: {access_key: (process.env.EXCHANGE_RATES_ACCESS_KEY), symbols:"USD,EUR"}}, {timeout: TIMEOUT, httpsAgent: new https.Agent({ keepAlive: true })});
      rates = exRates.rates;
      oneEur = rates.EUR;
      oneUsd = rates.USD;
      usdToeur = oneEur / oneUsd;
      
      await CONSTANT.findOneAndUpdate({name: "USDToEUR"}, [{$set: {value: usdToeur.toString(), date: new Date()}}], {upsert: true});
      
      console.log("Auto Conversion succeeded: ", "EUR = ", oneEur, " and USD = ", oneUsd, " and the conversion from USD to EUR = ", usdToeur);
      return usdToeur;
    }
    catch(e){
      try{
        let constDoc = await CONSTANT.findOne({name: "USDToEUR"});
        if(constDoc == null){
          console.log("Auto Conversion failed due to API connection error: Using the backup value which is ", backup);
          return backup;
        }
        else{
          console.log("Auto Conversion failed due to API connection error: Using the latest stored value which is ", parseFloat(constDoc.value));
          return parseFloat(constDoc.value);
        }
      }
      catch(e){
        console.log("Auto Conversion failed due to API connection error and we couldn't fetch the latest value from the database: Using the backup value which is ", backup);
        return backup;
      }
    }
  }
  else{
    return conversion;
  }
}


// from indian rupee to euro
const convertFromINRtoEUR = async(conversion, backup)=>{
  if(!conversion){
    // Get latest conversions from USD to EUR
    let TIMEOUT = parseInt(process.env.TIMEOUT) || config.TIMEOUT;
    let rates, oneEur, oneUsd, usdToeur;
    try{
      const {data: exRates} = await axios.get(config.EXCHANGE_RATES_API+"/latest", {params: {access_key: (process.env.EXCHANGE_RATES_ACCESS_KEY), symbols:"INR,EUR"}}, {timeout: TIMEOUT, httpsAgent: new https.Agent({ keepAlive: true })});
      rates = exRates.rates;
      oneEur = rates.EUR;
      oneUsd = rates.INR;
      usdToeur = oneEur / oneUsd;
      
      await CONSTANT.findOneAndUpdate({name: "INRToEUR"}, [{$set: {value: usdToeur.toString(), date: new Date()}}], {upsert: true});
      
      console.log("Auto Conversion succeeded: ", "EUR = ", oneEur, " and INR = ", oneUsd, " and the conversion from INR to EUR = ", usdToeur);
      return usdToeur;
    }
    catch(e){
      try{
        let constDoc = await CONSTANT.findOne({name: "INRToEUR"});
        if(constDoc == null){
          console.log("Auto Conversion failed due to API connection error: Using the backup value which is ", backup);
          return backup;
        }
        else{
          console.log("Auto Conversion failed due to API connection error: Using the latest stored value which is ", parseFloat(constDoc.value));
          return parseFloat(constDoc.value);
        }
      }
      catch(e){
        console.log("Auto Conversion failed due to API connection error and we couldn't fetch the latest value from the database: Using the backup value which is ", backup);
        return backup;
      }
    }
  }
  else{
    return conversion;
  }
}


// from sterling to euro
const convertFromGBPtoEUR = async(conversion, backup)=>{
  if(!conversion){
    // Get latest conversions from USD to EUR
    let TIMEOUT = parseInt(process.env.TIMEOUT) || config.TIMEOUT;
    let rates, oneEur, oneUsd, usdToeur;
    try{
      const {data: exRates} = await axios.get(config.EXCHANGE_RATES_API+"/latest", {params: {access_key: (process.env.EXCHANGE_RATES_ACCESS_KEY), symbols:"GBP,EUR"}}, {timeout: TIMEOUT, httpsAgent: new https.Agent({ keepAlive: true })});
      rates = exRates.rates;
      oneEur = rates.EUR;
      oneUsd = rates.GBP;
      usdToeur = oneEur / oneUsd;
      
      await CONSTANT.findOneAndUpdate({name: "GBPToEUR"}, [{$set: {value: usdToeur.toString(), date: new Date()}}], {upsert: true});
      
      console.log("Auto Conversion succeeded: ", "EUR = ", oneEur, " and GBP = ", oneUsd, " and the conversion from GBP to EUR = ", usdToeur);
      return usdToeur;
    }
    catch(e){
      try{
        let constDoc = await CONSTANT.findOne({name: "GBPToEUR"});
        if(constDoc == null){
          console.log("Auto Conversion failed due to API connection error: Using the backup value which is ", backup);
          return backup;
        }
        else{
          console.log("Auto Conversion failed due to API connection error: Using the latest stored value which is ", parseFloat(constDoc.value));
          return parseFloat(constDoc.value);
        }
      }
      catch(e){
        console.log("Auto Conversion failed due to API connection error and we couldn't fetch the latest value from the database: Using the backup value which is ", backup);
        return backup;
      }
    }
  }
  else{
    return conversion;
  }
}



/*
    Asynchronous delay
    use "await" to halt the execution until the delay finishes
*/
const delay = (milliseconds)=>{
    return new Promise((resolve, reject)=>{
        setTimeout(()=>{
            resolve();
        }, milliseconds);
    });
}


/*
    it loads the names and urls of all companies from the source
    the urls are used to access the products list of that company
*/ 
const getBrandsInfo = ()=>{
    return new Promise((resolve, reject)=>{
        const SOURCE = config.SOURCE;
        request({
            url: SOURCE + '/makers.php3',
            headers: {
              "User-Agent": "request"
            }
          }, (err, resp, html)=>{
            if (!err){
              $ = cheerio.load(html);
              let brandsInfo = [];
              let brands = $('table').find('td');
        
              brands.each((i, el) => {
                let url = $(el).find('a').attr('href').trim();
                let name =  $(el).find('a').text().replace(' devices', '').replace(/[0-9]/g, "").trim();
                brandsInfo.push({name: name, url: url});
              });
              resolve(brandsInfo);
            }
            else{
              reject(err);
            }
        });
    });
}


/*
    * uses the function "getBrandsInfo" to load the names and urls of all available brands on source
    * for each brand, do the following:
        1- look for the brand in the db
        2- if found, obtain the latest phone we have for this brand. if not, check if it's a potential toxic brand and act accordingly
        3- get the list of new phones for this brand from the source. ("new phones" means all phones that are newer than latest phone we have for this brand)
        4- reverse the list of new phones, so that the oldest phone in the list comes first
        5- for each phone in the list of new phones, do the followig
          5.1- request the phone page from the source
          5.2- check if its specs match the pre-defined criterea
          5.3- if the specs match and the current brand is not in the DB, add it to the DB
          5.4- if the specs match, collect the specs and add them to the DB. if not, skip this phone and go to the next one
    * document the update opertaion by storing, the list of phones added, list of companies added, and the date of the operation, setting isUpdating to false, setting failed to false
    * return the following:
        NOTHING
    * in case of error:
        set the isUpdating to false
        reutrn the error
    * delays: (amount: 3000 ms)
        from one page to another in the same brand (pagination in brand)
        from the specs page of a phone to another
        from one brand to another
    * scheduling:
        this function is scheduled to run on the first day of each month at 12:00 PM
        if it runs first, then an admin requested manual update, an error will be returned to the admin indication that there is a currently running update process
        if the manual update runs first, then the scheduling time came, the function will check the status of the latest update. If it is updating, the function will exit, else the function will continue
        since the manual update runs first, so the status of the latest update must be (isUpdating = true) 
*/
exports.updatePhonesFromSource = (brandCollection, phoneCollection, phoneSpecsCollection, nPhoneCollection, updateCollection, scheduled=false) =>{
    return new Promise(async(resolve, reject)=>{
      let startTime = new Date();
      console.log("Started the update operation at: ", startTime);
      let conversionFromUSDtoEur = null;
      let conversionFromINRtoEur = null;
      let conversionFromGBPtoEur = null;
      let USD_TO_EUR = parseFloat(process.env.USD_TO_EUR) || config.USD_TO_EUR;
      let INR_TO_EUR = parseFloat(process.env.INR_TO_EUR) || config.INR_TO_EUR;
      let GBP_TO_EUR = parseFloat(process.env.GBP_TO_EUR) || config.GBP_TO_EUR;
      let DELAY_AMOUNT = parseInt(process.env.DELAY_AMOUNT) || config.DELAY_AMOUNT;
      let TIMEOUT = parseInt(process.env.TIMEOUT) || config.TIMEOUT;
      let SOURCE = config.SOURCE;
      let newStoredPhones = [];
      let brands = [];
      let newBrands = [];
      let updateLog;

      // latest phone from each toxic brand (brands with very old phones)
      // type the name of brand in lowercase letters
      let latestToxic = {
        "amoi": "e860",
        "at&t": "quickfire",
        benefon: "twig discovery pro",
        "benq-siemens": "sf71",
        bird: "m32",
        bosch: "909 dual s",
        chea: "a90",
        emporia: "glam",
        ericsson: "r600",
        eten: "glofiish x610",
        "fujitsu siemens": "t830",
        "i-mate": "810-f",
        innostream: "inno a20",
        maxon: "mx-c90",
        mitsubishi: "m430i/m900",
        modu: "t",
        mwg: "zinc ii",
        nec: "terrain",
        o: "XDA Serra",
        neonode: "n2",
        palm: "palm",
        qtek: "9600",
        sagem: "puma phone",
        sendo: "x2",
        sewon: "srs-3300",
        siemens: "al21",
        "tel.me.": "t939",
        telit: "t800",
        thuraya: "sg-2520",
        "vk mobile": "vk2030",
        wnd: "wind van gogh 2100",
        xcute: "dv80"
      };

      // semi-toxic means that the brand's latest phone is a tablet or a not-modern phone which we don't want to add to the DB
      // type the name of brand in lowercase letters
      let latestSemiToxic = {
        "acer": "Chromebook Tab 10",
        "amazon": "Fire HD 10 Plus (2021)",
        "archos": "Diamond",
        "cat": "S22 Flip",
        "dell": "Venue 10 7000",
        "garmin-asus": "A10",
        "haier": "C300",
        "icemobile": "G8 LTE",
        "lenovo": "Legion Y700",
        "pantech": "Breeze IV",
        "parla": "Minu P124",
        "plum": "Ram 10 LTE",
        "spice": "Smart Pulse (M-9010)",
        "toshiba": "Excite Go"
      };

      if(scheduled){
        let latestUpdate = await updateCollection.find({}).sort({createdAt: -1}).limit(1);
        if(latestUpdate.length > 0){
          if(latestUpdate[0].isUpdating == true){
            console.log("Seems to be a manual update is running, cancelling the scheduled job");
            return resolve();
          }
        }
      }

      console.log("current delay: ", DELAY_AMOUNT);

      try{
        
        //getting brands' names and urls
        brands = await getBrandsInfo();
        
        // brands = [{
        //   "name": "Cat",
        //   "url": "cat-phones-89.php"
        // }];

        // initialize an update log (isUpdating: true)
        let updateDate = new Date();
        updateLog =  await updateCollection.create({createdAt: updateDate, automatic: scheduled}); 
        
        const convertMonthNumToName = (monthNum)=>{
          switch(monthNum){
              case 0: return "January";
              case 1: return "February";
              case 2: return "March";
              case 3: return "April";
              case 4: return "May";
              case 5: return "June";
              case 6: return "July";
              case 7: return "August";
              case 8: return "September";
              case 9: return "October";
              case 10: return "November";
              case 11: return "December";
          }
        }

        let day = new Date(updateDate).getDate();
        let year = new Date(updateDate).getFullYear();
        let month = convertMonthNumToName(new Date(updateDate).getMonth());
        updateDate = year + ", " + month + " " + ((day<10)?"0"+day:day);
        //console.log(updateDate)
        
        // for each brand, do the following
        for(let x=0; x<brands.length; x++){
          await delay(DELAY_AMOUNT);

          // declaring vars
          let newPhones = [];
          let latestPhone; 
          let brand;  // if null, it indeicates that the brand doesn't exist
          
          console.log("scanning brand: ", brands[x].name);

          // get company document to get its id
          brand = await brandCollection.findOne({nameLower: brands[x].name.toLowerCase()});
          // if the company doesn't exist, it has no latest phone
          if(!brand){
            console.log("brand: ", brands[x].name, " is not in the DB");
            latestPhone == null;
          }
          else{
            // if the company exists, use its id to get its the latest phone from DB
            let latestphoneDoc = await phoneCollection.find({company: brand._id, manual: {$ne: true}}, {name:1, _id: 0}).sort({createdAt: -1}).limit(1);
            if(latestphoneDoc.length > 0){
              latestPhone = latestphoneDoc[0].name;
            }
            else{
              latestPhone == null;
            }
          }

          // get the new phones made by the brand, (new phones: phones that are newer than the latest phone)
          const {data: response} = await axios.get(SOURCE + '/' + brands[x].url, {timeout: TIMEOUT, httpsAgent: new https.Agent({ keepAlive: true })});
          $ = cheerio.load(response);
          let phones = $('.makers').find('li');
          let goNextPage = true;
          for(let j=0; j<phones.length; j++){
              let phone = {
                  name: $(phones[j]).find('span').text().trim(),
                  img: $(phones[j]).find('img').attr('src').trim(),
                  url: $(phones[j]).find('a').attr('href').trim(),
              };
              if(!brand){
                if(latestToxic[brands[x].name.toLowerCase()]){
                  // toxic brand
                  if(latestToxic[brands[x].name.toLowerCase()].toLowerCase() == phone.name.toLowerCase()){
                    console.log("Brand ", brands[x].name, " is considered toxic")
                    goNextPage = false;
                    break;
                  }
                  else{
                    // toxic brands but has new phones
                    newPhones.push(phone);
                  }
                }
                else{
                  // new brand
                  newPhones.push(phone);
                }
              }
              else if(latestSemiToxic[brands[x].name.toLowerCase()]){
                // semi-toxic brand
                if(latestSemiToxic[brands[x].name.toLowerCase()].toLowerCase() == phone.name.toLowerCase()){
                  console.log("Brand ", brands[x].name, " is considered semi-toxic")
                  goNextPage = false;
                  break;
                }
                else{
                  // semi-toxic brands but has new phones
                  if(!(brand.name + ' ' + phone.name == latestPhone && latestPhone != null)){
                    newPhones.push(phone);
                  }
                }
              }
              else if(brand.name + ' ' + phone.name == latestPhone && latestPhone != null){
                  goNextPage = false;
                  break;
              }
              else{
                  newPhones.push(phone);
              }
          }
          // handle pagination
          let nextPage = $('a.pages-next').attr('href');
          while(nextPage != "#1" && nextPage != null && goNextPage == true){
            await delay(DELAY_AMOUNT);
            const {data: responsePage} = await axios.get(SOURCE + '/' + nextPage, {timeout: TIMEOUT, httpsAgent: new https.Agent({ keepAlive: true })});
            $ = cheerio.load(responsePage);
            let phones = $('.makers').find('li');
            for(let j=0; j<phones.length; j++){
              let phone = {
                  name: $(phones[j]).find('span').text(),
                  img: $(phones[j]).find('img').attr('src'),
                  url: $(phones[j]).find('a').attr('href'),
              };
              if(!brand){
                newPhones.push(phone);
              }
              else if(brand.name + ' ' + phone.name == latestPhone && latestPhone != null){
                  goNextPage = false;
                  break;
              }
              else{
                  newPhones.push(phone);
              }
            }
            nextPage = $('a.pages-next').attr('href');
          }

          // itertating over the new phones backwards (so that the older phones are stored first) to test them then add them if they pass the test
          for(let i=newPhones.length-1; i>=0; i--){
            await delay(DELAY_AMOUNT);
            const {data: sepcsResponse} = await axios.get(SOURCE + '/' + newPhones[i].url, {timeout: TIMEOUT, httpsAgent: new https.Agent({ keepAlive: true })});
            $ = cheerio.load(sepcsResponse);
            
            // gathering specs from source
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
                    specList.push(a);
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
            // reused
            let displayInfo, displaySizeObj;
            // ai vars
            let length, width, height, weightNum,
            displaySizeInch, screen2BodyRatio,
            resolutionLength, resolutionWidth, resolutionDensity, 
            intMemArr, 
            loudSpeaker, withSterio, sound3p5mmBool,
            bluetoothVersion, nfcBool, usbType, usbVersion,
            gyro, proximity, fingerprintDetails,
            batteryCapacity, chargingPower;

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
              // launch and status checks are applied here
              if(!(launchAvailability[0].value.match(new RegExp("Available")) || launchAvailability[0].value.match(new RegExp("Discontinued")))){
                // res.setHeader("Content-Type", "application/json");
                // res.json({status: "skipped"});
                console.log("status not avilable nor disconinued", newPhones[i].url);
                continue;
              }
              
              let launchAnnouncement =  launchInfo[0].specs.filter((item)=>{
                return item.name == "Announced";
              });
              if(launchAnnouncement[0].value.match(new RegExp("Not", "i"))){
                console.log("Announced: not announced yet", newPhones[i].url);
                continue;
              }
            }
            catch(e){
              console.log("Launch or Launch:Status or Launch:Announced doesn't exist", newPhones[i].url);
              continue;
            }


            /*
              only inlude the following:
                3.4 <= screen size < 7
                7 <= screen size <= 8.1  and  screen to body ratio >= 77
                screen to body ratio >= 140
              if "Display" or "Display: Size" don't exist, refuse the phone
            */
            try{
              displayInfo = spec_detail.filter((item)=>{
                return item.category == "Display";
              });
              displaySizeObj = displayInfo[0].specs.filter((item)=>{
                return item.name == "Size";
              });
              displaySizeObj = displaySizeObj[0].value.trim();
              let displaySizeElems = displaySizeObj.split(" ");
              let sizeInInches = parseFloat(displaySizeElems[0]);
              displaySizeInch = sizeInInches.toString(); 

              let screenToBodyRatio;
              try{
                let screenToBodyRatioString = displaySizeElems[4];
                let screenToBodyRatioElements = screenToBodyRatioString.split(" ");
                screenToBodyRatio = parseFloat(screenToBodyRatioElements[0].substring(2));
                screen2BodyRatio = screenToBodyRatio.toString();
              }
              catch(e){
                screen2BodyRatio = "0";
              }
              
            
              //console.log("size in inches: ", sizeInInches, "\nscreen to body ratio: ", screenToBodyRatio);
              
              /* 
                only inlude the following: (advance to the next condition only if the current one fails)
                  1- 3.4 <= screen size < 7
                  2- 7 <= screen size <= 8.1  and  screen to body ratio >= 77
                  3- screen to body ratio >= 140
              */
              // display checks are applied here
              if(!((sizeInInches >= 3.4 && sizeInInches < 7))){
                if(!((sizeInInches >= 7 && sizeInInches <= 8.1 && screenToBodyRatio >= 77))){
                  if(!((screenToBodyRatio >= 140))){
                    console.log("display size not valid", newPhones[i].url);
                    continue;
                  }
                }
              }
            }
            catch(e){
              console.log("Display or Display:Size doesn't exist or size in inches or screen ratio is not valid", newPhones[i].url);
              continue;
            }


            // by now, we are certain that there is a phone that passed the tests
            // if brand is null, then we need to create a document for that brand
            if(!brand){
              // adding / creating new brand / company document
              brand = await brandCollection.create({name: brands[x].name, 
                nameLower: brands[x].name.toLowerCase()});
              newBrands.push({
                name: brand.name,
                id: brand._id
              });
              console.log("Brand: ", brand.name, " is added to the DB");
            }

            console.log("Adding: ", newPhones[i].url);

            let searchWord = newPhones[i].name;
            searchWord = searchWord.trim();
  
            // replace multiple spaces with single space then convert to array
            searchWord = searchWord.replace(/\s+/g, " "); 
            searchWord = searchWord.split("");
            
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

            let testDoc = await phoneCollection.findOneAndUpdate({name: {$regex: "^"+brand.name+" "+searchWord+"$", $options: "i"}}, {$set: {company: brand._id}});
            if(testDoc){
              console.log("Phone: ", newPhones[i].name, " already exists in the DB. Upading company id");
              continue;
            }


            // getting processed specs of valid phones
            //---------------------------------
            
            // network: technology
            try{
              let network = spec_detail.filter((item)=>{
                return item.category == "Network";
              });
              let networkTechField = network[0].specs.filter((item)=>{
                return item.name == "Technology";
              });
              networkTech = networkTechField[0].value.trim();
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
                })[0].value.trim();
                allDimesnions = allDimesnions.split(" ").slice(0, 6);
                bodyDimensions = allDimesnions.join(" ");

                try{
                  if(allDimesnions[0].match(new RegExp("unfold", "i"))){
                    allDimesnions = allDimesnions.slice(1);
                  }
                  length = allDimesnions[0];
                  width = allDimesnions[2];
                  height = allDimesnions[4];
                }
                catch(e){
                  length = "0";
                  width = "0";
                  height = "0";
                }

              }
              catch(e){
                bodyDimensions = null;
                length = "0";
                width = "0";
                height = "0";
              }
              try{
                let allWeight = body[0].specs.filter((item)=>{
                  return item.name == "Weight"; 
                })[0].value.trim();

                allWeight = allWeight.split(" ").slice(0, 2);
                weightNum = allWeight[0];
                bodyWeight = allWeight.join(" ");
              }
              catch(e){
                bodyWeight = null;
                weightNum = "0";
              }
              try{
                bodySim = body[0].specs.filter((item)=>{
                  return item.name == "SIM"; 
                })[0].value.trim();
              }
              catch(e){
                bodySim = null;
              }
            }
            catch (e){
              bodyDimensions = null;
              bodyWeight = null;
              bodySim = null;
              length = "0";
              width = "0";
              height = "0";
              weightNum = "0";
            }

            // display: type, size, resolution, protection
            try{
              displayType = displayInfo[0].specs.filter((item)=>{
                return item.name == "Type";
              })[0].value.trim();
            }
            catch(e){
              displayType = null;
            }

            try{
              displayResolution = displayInfo[0].specs.filter((item)=>{
                return item.name == "Resolution";
              })[0].value.trim();

              let resolutionElements = displayResolution.split(" ");

              try{
                resolutionLength = resolutionElements[0];
                resolutionWidth = resolutionElements[2];
              }
              catch(e){
                resolutionLength = "0"
                resolutionWidth = "0"
              }
              
              try{
                let resolutionDensityElements = resolutionElements.filter((item)=>{
                  return item[0] == "(";
                });
                resolutionDensityElements = resolutionDensityElements[0].split(" ");
                resolutionDensity = resolutionDensityElements[0].substring(2);
              }
              catch(e){
                resolutionDensity = "0";
              }
            }
            catch(e){
              displayResolution = null;
              resolutionLength = "0";
              resolutionWidth = "0";
              resolutionDensity = "0";
            }

            try{
              displayProtection = displayInfo[0].specs.filter((item)=>{
                return item.name == "Protection";
              })[0].value.trim();
            }
            catch(e){
              displayProtection = null;
            }

            try{
              displaySize = displaySizeObj;
            }
            catch(e){
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
                })[0].value.trim();
              }
              catch(e){
                platformOs = null;
              }
              try{
                platformChipset = body[0].specs.filter((item)=>{
                  return item.name == "Chipset"; 
                })[0].value.trim();
              }
              catch(e){
                platformChipset = null;
              }
              try{
                platformCpu = body[0].specs.filter((item)=>{
                  return item.name == "CPU"; 
                })[0].value.trim();
              }
              catch(e){
                platformCpu = null;
              }
              try{
                platformGpu = body[0].specs.filter((item)=>{
                  return item.name == "GPU"; 
                })[0].value.trim();
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
                })[0].value.trim();
              }
              catch(e){
                memoryCardSlot = null;
              }
              try{
                memoryInternal = body[0].specs.filter((item)=>{
                  return item.name == "Internal"; 
                })[0].value.trim();

                intMemArr = memoryInternal.split(",");
                for(let c=0; c<intMemArr.length; c++){
                  intMemArr[c] = intMemArr[c].trim();
                }
              }
              catch(e){
                memoryInternal = null;
                intMemArr = [];
              }
            }
            catch (e){
              memoryInternal = null;
              memoryCardSlot = null;
              intMemArr = [];
            }

            // main camera: mainCameraTypeSpaceDetails
            try{
              let body = spec_detail.filter((item)=>{
                return item.category == "Main Camera";
              });
              try{
                let cameraType = body[0].specs[0].name.trim();
                let cameraDetails = body[0].specs[0].value.trim();
                mainCameraTypeSpaceDetails = (cameraType + " " + cameraDetails).trim();
                if(mainCameraTypeSpaceDetails == ""){
                  mainCameraTypeSpaceDetails = null;
                }
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
                let cameraType = body[0].specs[0].name.trim();
                let cameraDetails = body[0].specs[0].value.trim();
                selfieCameraTypeSpaceDetails = (cameraType + " " + cameraDetails).trim();
                if(selfieCameraTypeSpaceDetails == ""){
                  selfieCameraTypeSpaceDetails = null;
                }
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
                })[0].value.trim();

                loudSpeaker = (soundLoudSpeaker.match(new RegExp("yes", "i")))? true: false;
                withSterio = (soundLoudSpeaker.match(new RegExp("stereo", "i")))? true: false;
              }
              catch(e){
                soundLoudSpeaker = null;
                loudSpeaker = false;
                withSterio = false;
              }
              try{
                sound3p5mm = body[0].specs.filter((item)=>{
                  return item.name == "3.5mm jack";
                })[0].value.trim();

                sound3p5mmBool = (sound3p5mm.match(new RegExp("yes", "i")))?true:false;
              }
              catch(e){
                sound3p5mm = null;
                sound3p5mmBool = false;
              }
            }
            catch (e){
              soundLoudSpeaker = null;
              sound3p5mm = null;
              loudSpeaker = false;
              withSterio = false;
              sound3p5mmBool = false;
            }

            // comms: Wlan, Bluetooth, Gps, Nfc, Radio, Usb
            try{
              let body = spec_detail.filter((item)=>{
                return item.category == "Comms";
              });
              try{
                commsWlan = body[0].specs.filter((item)=>{
                  return item.name == "WLAN";
                })[0].value.trim();
              }
              catch(e){
                commsWlan = null;
              }
              try{
                commsBluetooth = body[0].specs.filter((item)=>{
                  return item.name.trim() == "Bluetooth";
                })[0].value.trim();

                bluetoothVersion = commsBluetooth.split(",").filter((item)=>{
                  return !(isNaN(parseFloat(item)));
                });
                
                if(bluetoothVersion.length > 0){
                  bluetoothVersion = bluetoothVersion[0].trim();
                }
                else{
                  bluetoothVersion = "0";
                }
              }
              catch(e){
                commsBluetooth = null;
                bluetoothVersion = "0";
              }
              try{
                commsGps = body[0].specs.filter((item)=>{
                  return item.name.trim() == "GPS";
                })[0].value.trim();
              }
              catch(e){
                commsGps = null;
              }
              try{
                commsNfc = body[0].specs.filter((item)=>{
                  return item.name.trim() == "NFC";
                })[0].value.trim();

                nfcBool = (commsNfc.match(new RegExp("yes", "i")))?true:false;
              }
              catch(e){
                commsNfc = null;
                nfcBool = false;
              }
              try{
                commsRadio = body[0].specs.filter((item)=>{
                  return item.name.trim() == "Radio";
                })[0].value.trim();
              }
              catch(e){
                commsRadio = null;
              }
              try{
                commsUsb = body[0].specs.filter((item)=>{
                  return item.name.trim() == "USB";
                })[0].value.trim();

                usbVersion = "0";
                let usbTypeElems = [];
                let commUsbElems = commsUsb.split(",");
                
                // Handling "Lightening" word that appears before the USB details in apple phones
                if(commUsbElems[0].trim().match(new RegExp("Lightning", "i"))){
                  commUsbElems = commUsbElems[1].trim().split(" ");
                }
                else{
                  commUsbElems = commUsbElems[0].trim().split(" ");
                }

                for(let c=0; c<commUsbElems.length; c++){
                  if(isNaN(parseFloat(commUsbElems[c]))){
                    usbTypeElems.push(commUsbElems[c]);
                  }
                  else{
                    usbVersion = commUsbElems[c];
                    break;
                  }
                }
                usbType = usbTypeElems.join(" ");
              }
              catch(e){
                commsUsb = null;
                usbType = "";
                usbVersion = "0";
              }
            }
            catch (e){
              commsUsb = null;
              commsRadio = null;
              commsNfc = null;
              commsGps = null;
              commsBluetooth = null;
              commsWlan = null;
              nfcBool = false;
              bluetoothVersion = "0";
              usbType = "";
              usbVersion = "0";
            }  

            // features: Sensors
            try{
              let body = spec_detail.filter((item)=>{
                return item.category == "Features";
              });
              try{
                featuresSensors = body[0].specs.filter((item)=>{
                  return item.name == "Sensors";
                })[0].value.trim();

                gyro = false;
                proximity = false;
                fingerprintDetails = "";
                
                let featuresSensorsElems = featuresSensors.split(",");
                for(let c=0; c<featuresSensorsElems.length; c++){
                  if((featuresSensorsElems[c].match(new RegExp("gyro", "i"))) || 
                  featuresSensorsElems[c].match(new RegExp("gyroscope", "i"))){
                    gyro = true;
                  }
                  else if(featuresSensorsElems[c].match(new RegExp("proximity", "i"))){
                    proximity = true;
                  }
                  else if(featuresSensorsElems[c].match(new RegExp("Fingerprint", "i"))){
                    fingerprintDetails = featuresSensorsElems[c];
                  }
                }

              }
              catch(e){
                featuresSensors = null;
                gyro = false;
                proximity = false;
                fingerprintDetails = "";
              }
            }
            catch (e){
              featuresSensors = null;
              gyro = false;
              proximity = false;
              fingerprintDetails = "";
            }

            // battery: Type, Charging
            try{
              let body = spec_detail.filter((item)=>{
                return item.category == "Battery";
              });
              try{
                batteryType = body[0].specs.filter((item)=>{
                  return item.name == "Type";
                })[0].value.trim();

                let batteryTypeElemes = batteryType.split(" ");
                try{
                  batteryCapacity = batteryTypeElemes.filter((item)=>{
                    return !(isNaN(parseFloat(item)));
                  });
                  batteryCapacity = batteryCapacity[0].trim();
                }
                catch(e){
                  batteryCapacity = "0";
                }
              }
              catch(e){
                batteryType = null;
                batteryCapacity = "0";
              }
              try{
                batteryCharging = body[0].specs.filter((item)=>{
                  return item.name.trim() == "Charging";
                })[0].value.trim();

                fastCharging = (batteryCharging.match(new RegExp("fast", "i")))?true:false;

                let batteryChargingElems = batteryCharging.split(",")[0].split(" ");
                chargingPower = "0";

                for(let c=0; c<batteryChargingElems.length; c++){
                  let item = parseFloat(batteryChargingElems[c].substring(0, batteryChargingElems[c].length - 1));
                  if(!isNaN(item)){
                    chargingPower = item.toString();
                    break;
                  }
                }
              }
              catch(e){
                batteryCharging = null;
                fastCharging = false;
                chargingPower = "0";
              }
            }
            catch (e){
              batteryType = null;
              batteryCharging = null;
              batteryCapacity = "0";
              fastCharging = false;
              chargingPower = "0";
            }  

            // MISC: price
            try{
              let body = spec_detail.filter((item)=>{
                return item.category == "Misc";
              });
              try{
                let miscPriceAll = body[0].specs.filter((item)=>{
                  return item.name == "Price";
                })[0].value.trim().replace(/,/g, "");

                miscPriceAll = miscPriceAll.split(" ");
                miscPrice = miscPriceAll;

                if(miscPriceAll[0].match(new RegExp("About", "i"))){
                  let currency;
                  if(!isNaN(parseFloat(miscPriceAll[1]))){
                    currency = miscPriceAll[2];
                    if(currency.match(new RegExp("EUR", "i"))){
                      miscPrice = parseFloat(miscPriceAll[1]); // in EUR
                    }
                    else if(currency.match(new RegExp("USD", "i"))){
                      conversionFromUSDtoEur = await convertFromUSDtoEUR(conversionFromUSDtoEur, USD_TO_EUR);
                      miscPrice = parseFloat(miscPriceAll[1]) * conversionFromUSDtoEur;
                    }
                    else if(currency.match(new RegExp("INR", "i"))){
                      conversionFromINRtoEur = await convertFromINRtoEUR(conversionFromINRtoEur, INR_TO_EUR);
                      miscPrice = parseFloat(miscPriceAll[1]) * conversionFromINRtoEur;
                    }
                    else if(currency.match(new RegExp("GBP", "i"))){
                      conversionFromGBPtoEur = await convertFromGBPtoEUR(conversionFromGBPtoEur, GBP_TO_EUR);
                      miscPrice = parseFloat(miscPriceAll[1]) * conversionFromGBPtoEur;
                    }
                  }
                  else if(miscPriceAll[1][0] == "$"){
                    // currency = "usd";
                    conversionFromUSDtoEur = await convertFromUSDtoEUR(conversionFromUSDtoEur, USD_TO_EUR);
                    miscPrice = parseFloat(miscPrice[1].substring(1)) * conversionFromUSDtoEur;
                  }
                  else if(miscPriceAll[1][0] == "₹"){
                    // currency = "inr";
                    conversionFromINRtoEur = await convertFromINRtoEUR(conversionFromINRtoEur, INR_TO_EUR);
                    miscPrice = parseFloat(miscPrice[1].substring(1)) * conversionFromINRtoEur;
                  }
                  else if(miscPriceAll[1][0] == "£"){
                    // currency = "gbp";
                    conversionFromGBPtoEur = await convertFromGBPtoEUR(conversionFromGBPtoEur, GBP_TO_EUR);
                    miscPrice = parseFloat(miscPrice[1].substring(1)) * conversionFromGBPtoEur;
                  }
                }
                else{
                  try{
                    let dollarPrice = miscPriceAll.filter((item)=>{
                      return item[0] == "€";
                    })[0];

                    if(!dollarPrice){
                      throw new Error();
                    }

                    miscPrice = parseFloat(dollarPrice.substring(1)); // in EUR
                  }
                  catch(e){
                    try{
                      let euroPrice = miscPriceAll.filter((item)=>{
                        return item[0] == "$";
                      })[0];

                      if(!euroPrice){
                        throw new Error();
                      }

                      conversionFromUSDtoEur = await convertFromUSDtoEUR(conversionFromUSDtoEur, USD_TO_EUR);
                      miscPrice = parseFloat(euroPrice.substring(1)) * conversionFromUSDtoEur;
                    }
                    catch(e){
                      try{
                        let euroPrice = miscPriceAll.filter((item)=>{
                          return item[0] == "₹";
                        })[0];
                        
                        if(!euroPrice){
                          throw new Error();
                        }

                        conversionFromINRtoEur = await convertFromINRtoEUR(conversionFromINRtoEur, INR_TO_EUR);
                        miscPrice = parseFloat(euroPrice.substring(1)) * conversionFromINRtoEur;
                      }
                      catch(e){
                        try{
                          let euroPrice = miscPriceAll.filter((item)=>{
                            return item[0] == "£";
                          })[0];
    
                          if(!euroPrice){
                            throw new Error();
                          }

                          conversionFromGBPtoEur = await convertFromGBPtoEUR(conversionFromGBPtoEur, GBP_TO_EUR);
                          miscPrice = parseFloat(euroPrice.substring(1)) * conversionFromGBPtoEur;
                        }
                        catch(e){
                          miscPrice = null;
                        }
                      }
                    }
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
      
            // Here add to the DB
            //---------------------
            let phoneBasic;

            // creating a document for the phone
            phoneBasic = await phoneCollection.create({
              name: brand.name + ' ' + newPhones[i].name,
              company: brand._id,
              picture: newPhones[i].img,
              releaseDate: (launchReleaseDate)? launchReleaseDate : updateDate
            });

            // creating a document for the specs of the phone
            await phoneSpecsCollection.create({
              _id: phoneBasic._id,
              price: isNaN(miscPrice)?null:miscPrice,
              releaseDate: (launchReleaseDate)? launchReleaseDate : updateDate,
              dimensions: bodyDimensions,
              newtork: networkTech,
              weight: bodyWeight,
              sim: bodySim,
              screenType: displayType,
              screenSize: displaySize,
              screenResolution: displayResolution,
              screenProtection: displayProtection,
              os: platformOs,
              chipset: platformChipset,
              cpu: platformCpu,
              gpu: platformGpu,
              exMem: memoryCardSlot,
              intMem: memoryInternal,
              mainCam: mainCameraTypeSpaceDetails,
              selfieCam: selfieCameraTypeSpaceDetails,
              loudspeaker: soundLoudSpeaker,
              slot3p5mm: sound3p5mm,
              wlan: commsWlan,
              bluetooth: commsBluetooth,
              gps: commsGps,
              nfc: commsNfc,
              radio: commsRadio,
              usb: commsUsb,
              sensors: featuresSensors,
              battery: batteryType,
              charging: batteryCharging
            });


            // replacing the Q1, Q2, Q3, Q4 in the release date before adding to nPhone collection
            let month = launchReleaseDate.match(new RegExp("q[1-4]", "i"));
            if(month){
              if(month[0] == "q1" || month[0] == "Q1"){
                launchReleaseDate = launchReleaseDate.replace(new RegExp("q1", "i"), "January");
              }
              else if(month[0] == "q2" || month[0] == "Q2"){
                launchReleaseDate = launchReleaseDate.replace(new RegExp("q2", "i"), "April");
              }
              else if(month[0] == "q3" || month[0] == "Q3"){
                launchReleaseDate = launchReleaseDate.replace(new RegExp("q3", "i"), "July");
              }
              else if(month[0] == "q4" || month[0] == "Q4"){
                launchReleaseDate = launchReleaseDate.replace(new RegExp("q4", "i"), "October");
              }
            }

            // creating a document for phone specs for AI
            await nPhoneCollection.create({
              _id: phoneBasic._id,
              price: (miscPrice == null || isNaN(miscPrice))?null:miscPrice.toString(),
              name: brand.name + ' ' + newPhones[i].name,
              company: brand.name,
              releaseDate: (launchReleaseDate)? launchReleaseDate : updateDate,
              length: length,
              width: width,
              height: height,
              network: networkTech,
              weight: weightNum,
              sim: bodySim,
              screenType: displayType,
              screenSize: displaySizeInch,
              screen2bodyRatio: screen2BodyRatio,
              resolutionLength: resolutionLength,
              resolutionWidth: resolutionWidth,
              resolutionDensity: resolutionDensity,
              screenProtection: displayProtection,
              os: platformOs,
              chipset: platformChipset,
              cpu: platformCpu,
              gpu: platformGpu,
              intMem: intMemArr, // array
              mainCam: mainCameraTypeSpaceDetails,
              selfieCam: selfieCameraTypeSpaceDetails,
              hasLoudspeaker: loudSpeaker, // boolean
              hasStereo: withSterio, // boolean
              has3p5mm: sound3p5mmBool, // boolean
              wlan: commsWlan,
              bluetoothVersion: bluetoothVersion,
              hasNfc: nfcBool, // boolean
              radio: commsRadio,
              usbType: usbType,
              usbVersion: usbVersion,
              hasGyro: gyro, // boolean
              hasProximity: proximity, // boolean
              fingerprintDetails: fingerprintDetails,
              batteryCapacity: batteryCapacity,
              hasFastCharging: fastCharging, // boolean
              chargingPower: chargingPower
            });

            newStoredPhones.push({
              _id: phoneBasic._id
            });
          }

          console.log("brand: ", brands[x].name, " is completed successfully");
        }

        
        // updating the update log with the update operation result

        let companiesList = [];
        for(let b of newBrands){
          companiesList.push({
            _id: b.id
          });
        }
        let endTime = new Date();
        let difference = (endTime - startTime)/1000/60;
        console.log("Finished the update operation at: ", endTime);
        console.log("Duration in minutes: ", difference);
        
        await updateCollection.updateOne({_id: updateLog._id}, {$set: {
          phones: newStoredPhones,
          companies: companiesList,
          isUpdating: false,
          failed: false,
          durationMin: difference
        }});
        
        // final output
        resolve(); /*{brands: newBrands, phones: newStoredPhones}*/
      }
      catch(error){
        try{
          // error handling
          let companiesList = [];
          for(let b of newBrands){
            companiesList.push({
              _id: b.id
            });
          }

          let endTime = new Date();
          let difference = (endTime - startTime)/1000/60;
          console.log("Finished the update operation at: ", endTime);
          console.log("Duration in minutes: ", difference);

          await updateCollection.updateOne({_id: updateLog._id}, {$set: {
            phones: newStoredPhones,
            companies: companiesList,
            isUpdating: false,
            durationMin: difference
          }});
          reject({err: error}); /*{err: error, brands: newBrands, numPhones: newStoredPhones.length}*/
        }
        catch(e){
          reject({err: e}); /*{err: error, secondCatchError: e, brands: newBrands, numPhones: newStoredPhones.length}*/
        }
      }
    });
}