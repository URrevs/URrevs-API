const cheerio = require('cheerio');
const axios = require('axios');
const config = require("../config");
const request = require('request');



const convertFromUSDtoEUR = async(conversion, backup)=>{
  if(!conversion){
    // Get latest conversions from USD to EUR
    let exRates;
    try{
      exRates = await axios.get(config.EXCHANGE_RATES_API+"/latest", {params: {access_key: (process.env.EXCHANGE_RATES_ACCESS_KEY), symbols:"USD,EUR"}});
      let rates = exRates.data.rates;
      let oneEur = rates.EUR;
      let oneUsd = rates.USD;
      console.log("Auto Conversion succeeded: ", "EUR = ", oneEur, " and USD = ", oneUsd, " and the conversion from USD to EUR = ", oneEur / oneUsd);
      return oneEur / oneUsd;
    }
    catch(e){
      console.log("Auto Conversion failed: ", "coversion from USD to EUR = ", backup);
      console.log(exRates);
      return backup;
    }
  }
  else{
    return conversion;
  }
}

//exports.convertFromUSDtoEUR = convertFromUSDtoEUR;

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
    given a list of companies names
    it adds only the companies whose names are not in the database
    the companies names are trimmed, so that they have no spaces from right or left
    no capitalization effort is done
    part of "updateCompaniesFromSource"
*/
const updateCompaniesIntoDB = (brandNames, collection)=>{
    return new Promise(async(resolve, reject)=>{
      let AddedCompanies = [];
      try{
        for(let i=0; i<brandNames.length; i++){
          let brandName = brandNames[i].trim();
          let comp = await collection.findOne({name: brandName});
          if(!comp){
           let newBrand =  await collection.create({name: brandNames[i][0].toUpperCase() + brandNames[i].substring(1)});
           AddedCompanies.push({name: newBrand.name, id: newBrand._id});
          }
        }
        resolve(AddedCompanies);
      }
      catch(err){
        reject(err);
      }
    });
  }


/*
    given a COMPANY collection
    it loads the names of all companies from the source
    it uses the "updateCompaniesIntoDB" function to store the new companies
*/  
exports.updateCompaniesFromSource = (collection)=>{
    return new Promise((resolve, reject)=>{
        request({
            url: SOURCE + '/makers.php3',
            headers: {
              "User-Agent": "request"
            }
          }, (err, resp, html)=>{
            if (!err){
              $ = cheerio.load(html);
              let brandNames = [];
              let brands = $('table').find('td');
        
              brands.each((i, el) => {
                let name =  $(el).find('a').text().replace(' devices', '').replace(/[0-9]/g, "");
                brandNames.push(name);
              });
              
              updateCompaniesIntoDB(brandNames, collection).then((addedCompanies)=>{
                resolve(addedCompanies);
              })
              .catch((err)=>{
                reject(err);
              });
            }
            else{
              reject(err);
            }
        });
    });
}

/*
    it loads the names and urls of all companies from the source
    the urls are used to access the products list of that company
*/ 
exports.getBrandsLinks = ()=>{
    return new Promise((resolve, reject)=>{
        request({
            url: SOURCE + '/makers.php3',
            headers: {
              "User-Agent": "request"
            }
          }, (err, resp, html)=>{
            if (!err){
              $ = cheerio.load(html);
              let brandUrls = [];
              let brands = $('table').find('td');
        
              brands.each((i, el) => {
                let url = $(el).find('a').attr('href');
                let name =  $(el).find('a').text().replace(' devices', '').replace(/[0-9]/g, "");
                brandUrls.push({name: name, url: url});
              });
              resolve(brandUrls);
            }
            else{
              reject(err);
            }
        });
    });
}

/*
    given an url of a phone
    given the name of the most recently-added phone of a certain company
    given the company profile (brand)
    given the PHONE collection
    it collects the name, img, and url of the phones that are later than the latest phone we have for that company
    it supports auto pagination with a 1 sec delay before each page
    once the list of new phones is completed, we iterate over it and use the url to access the specs for each phone in the list 
*/
exports.updatePhonesFromSource = (brandUrl, latestPhone, brand, collection) =>{
    return new Promise(async(resolve, reject)=>{
      let conversionFromUSDtoEur = null;
      let USD_TO_EUR = parseFloat(process.env.USD_TO_EUR) || config.USD_TO_EUR;
      let DELAY_AMOUNT = parseInt(process.env.DELAY_AMOUNT) || config.DELAY_AMOUNT;
      let SOURCE = config.SOURCE;
      let newPhones = [];
      let newStoredPhones = [];

      console.log("current delay: ", DELAY_AMOUNT);

      try{
        
        let response = await axios.get(SOURCE + '/' + brandUrl);
        $ = cheerio.load(response.data);
        let phones = $('.makers').find('li');
        let goNextPage = true;
        for(let j=0; j<phones.length; j++){
            let phone = {
                name: $(phones[j]).find('span').text(),
                img: $(phones[j]).find('img').attr('src'),
                url: $(phones[j]).find('a').attr('href'),
            };
            if(brand.name + ' ' + phone.name == latestPhone && latestPhone != null){
                goNextPage = false;
                break;
            }
            else{
                newPhones.push(phone);
            }
        }
        let nextPage = $('a.pages-next').attr('href');
        while(nextPage != "#1" && nextPage != null && goNextPage == true){
            await delay(DELAY_AMOUNT);
            let responsePage = await axios.get(SOURCE + '/' + nextPage);
            $ = cheerio.load(responsePage.data);
            let phones = $('.makers').find('li');
            for(let j=0; j<phones.length; j++){
                let phone = {
                    name: $(phones[j]).find('span').text(),
                    img: $(phones[j]).find('img').attr('src'),
                    url: $(phones[j]).find('a').attr('href'),
                };
                if(brand.name + ' ' + phone.name == latestPhone && latestPhone != null){
                    goNextPage = false;
                    break;
                }
                else{
                    newPhones.push(phone);
                }
            }
            nextPage = $('a.pages-next').attr('href');
        }
        
        newPhones = newPhones.reverse();

        for(let i=0; i<newPhones.length; i++){
            await delay(DELAY_AMOUNT);
            let sepcsResponse = await axios.get(SOURCE + '/' + newPhones[i].url);
            $ = cheerio.load(sepcsResponse.data);
            
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
                3.4 < screen size < 7
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
                  1- 3.4 < screen size < 7
                  2- 7 <= screen size <= 8.1  and  screen to body ratio >= 77
                  3- screen to body ratio >= 140
              */
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


            console.log("Adding: ", newPhones[i].url);
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
            // try{
            //   let displayInfo = spec_detail.filter((item)=>{
            //     return item.category == "Display";
            //   });


            // }
            // catch(e){
            //   displayType = null;
            //   displayResolution = null;
            //   displayProtection = null;
            //   displaySize = null;
            // }

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
                })[0].value.trim().replace(",", "");

                miscPriceAll = miscPriceAll.split(" ");
                miscPrice = miscPriceAll;

                if(miscPriceAll[0].match(new RegExp("About", "i"))){
                  let currency;
                  if(!isNaN(parseFloat(miscPriceAll[1]))){
                    currency = miscPriceAll[2];
                    if(currency.match(new RegExp("EUR", "i"))){
                      miscPrice = parseFloat(miscPriceAll[1]); // in EUR
                    }
                  }
                  else if(miscPriceAll[1][0] == "$"){
                    // currency = "usd";

                    conversionFromUSDtoEur = await convertFromUSDtoEUR(conversionFromUSDtoEur, USD_TO_EUR);
  
                    miscPrice = parseFloat(miscPrice[1].substring(1)) * conversionFromUSDtoEur;
                  }
                }
                else{
                  try{
                    let dollarPrice = miscPriceAll.filter((item)=>{
                      return item[0] == "€";
                    })[0];
                    miscPrice = parseFloat(dollarPrice.substring(1)); // in EUR
                  }
                  catch(e){
                    try{
                      let euroPrice = miscPriceAll.filter((item)=>{
                        return item[0] == "$";
                      })[0];

                      conversionFromUSDtoEur = await convertFromUSDtoEUR(conversionFromUSDtoEur, USD_TO_EUR);

                      miscPrice = parseFloat(euroPrice.substring(1)) * conversionFromUSDtoEur;
                    }
                    catch(e){
                      miscPrice = null;
                    }
                  }

                  // if(miscPriceAll[0][0] == "$"){
                  //   miscPrice = parseFloat(miscPriceAll[0].substring(1));
                  // }
                  // else if(miscPriceAll[0][0] == "€"){
                  //   miscPrice = parseFloat(miscPriceAll[0].substring(1)) * EUR_TO_USD;
                  // }
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
            newStoredPhones.push({
              url: newPhones[i].url,
              name: brand.name + ' ' + newPhones[i].name,
              picture: newPhones[i].img,
              company: brand._id,
              networkTech: networkTech,
              launchReleaseDate: launchReleaseDate,
              bodyDimensions: bodyDimensions,
              bodyWeight: bodyWeight,
              bodySim: bodySim,
              displayType: displayType,
              displaySize: displaySize,
              displayResolution: displayResolution,
              displayProtection: displayProtection,
              platformOs: platformOs,
              platformChipset: platformChipset,
              platformCpu: platformCpu,
              platformGpu: platformGpu,
              memoryCardSlot: memoryCardSlot,
              memoryInternal: memoryInternal,
              mainCameraTypeSpaceDetails: mainCameraTypeSpaceDetails,
              selfieCameraTypeSpaceDetails: selfieCameraTypeSpaceDetails,
              soundLoudSpeaker: soundLoudSpeaker,
              sound3p5mm: sound3p5mm,
              commsWlan: commsWlan,
              commsBluetooth: commsBluetooth,
              commsGps: commsGps,
              commsNfc: commsNfc,
              commsRadio: commsRadio,
              commsUsb: commsUsb,
              featuresSensors: featuresSensors,
              batteryType: batteryType,
              batteryCharging: batteryCharging,
              miscPrice: isNaN(miscPrice)?null:miscPrice,
              //-----------------------------
              mlPrice: (miscPrice == null || isNaN(miscPrice))?null:miscPrice,
              mlName: brand.name + ' ' + newPhones[i].name,
              mlComp: brand._id,
              mlReleaseDate: launchReleaseDate,
              dimLength: length,
              dimWidth: width,
              dimHeight: height,
              mlNetwork: networkTech,
              mlWeight: weightNum,
              mlSim: bodySim,
              mlDisplayType: displayType,
              dispSizeInch: displaySizeInch,
              mlscreen2body: screen2BodyRatio,
              resolutionLength: resolutionLength,
              resolutionWidth: resolutionWidth,
              resolutionDensity: resolutionDensity,
              mlOs: platformOs,
              mlChipse: platformChipset,
              mlCpu: platformCpu,
              mlGpu: platformGpu,
              mlIntMem: intMemArr, // array
              mainCam: mainCameraTypeSpaceDetails,
              selfCam: selfieCameraTypeSpaceDetails,
              hasLoudspeaker: loudSpeaker, // boolean
              hasStereo: withSterio, // boolean
              has3p5mm: sound3p5mmBool, // boolean
              mlWlan: commsWlan,
              bluetoothVersion: bluetoothVersion,
              nfcBool: nfcBool, // boolean
              mlRadio: commsRadio,
              usbType: usbType,
              usbVersion: usbVersion,
              hasGyro: gyro, // boolean
              hasProximity: proximity, // boolean
              fingerprintDetails: fingerprintDetails,
              batteryCapacity: batteryCapacity,
              fastCharging: fastCharging, // boolean
              chargingPower: chargingPower
            });




            // // Apply checks over the phone specs
            // let skipThis = false;
            // for(let j=0; j<spec_detail.length && skipThis == false; j++){
          
            //   let currentCategory = spec_detail[j];
          
            //   // only include "Available" and "Discontinuous" status in launch
            //   if(currentCategory.category == "Launch"){
            //     for(let k=0; k<currentCategory.specs.length; k++){
            //       if(currentCategory.specs[k].name == "Status"){
            //         if(!(currentCategory.specs[k].value.match(new RegExp("Available")) || currentCategory.specs[k].value.match(new RegExp("Discontinued")))){
            //           skipThis = true;
            //           break;
            //         }
            //       }
            //     }
            //   }
          
            //   /* 
            //     only inlude the following:
            //       3.5 < screen size < 7
            //       7 <= screen size <= 8.1  and  screen to body ratio >= 77
            //       screen to body ratio >= 140
            //   */
            //   if(currentCategory.category == "Display"){
            //     for(let k=0; k<currentCategory.specs.length; k++){
            //       if(currentCategory.specs[k].name == "Size"){
            //         let sizeString = currentCategory.specs[k].value;
            //         let sizeElements = sizeString.split(" ");
            //         let sizeInInches = parseFloat(sizeElements[0]);
            //         let screenToBodyRatioString = sizeElements[4];
            //         let screenToBodyRatioElements = screenToBodyRatioString.split(" ");
            //         let screenToBodyRatio = parseFloat(screenToBodyRatioElements[0].substring(2));
          
            //         console.log("size in inches: ", sizeInInches, "\nscreen to body ratio: ", screenToBodyRatio);
            //         if(!
            //           ((sizeInInches > 3.5 && sizeInInches < 7) || 
            //           (sizeInInches >= 7 && sizeInInches <= 8.1 && screenToBodyRatio >= 77) ||
            //           (screenToBodyRatio > 140))){
            //             skipThis = true;
            //             break;
            //         }
            //       }
            //     }
            //   }
            // }
          
            // if(!skipThis){
            //   // gather specs

            // }
            // else{
            //   console.log(newPhones[i].url)
            //   continue;
            // }
            


            // let newPhone = await collection.create({
            //     name: brand.name + ' ' + newPhones[i].name,
            //     picture: newPhones[i].img,
            //     company: brand._id
            // });
            // newStoredPhones.push(newPhone);
        }

        resolve(newStoredPhones);
      }
      catch(err){
        reject({
          err: err,
          phones: newStoredPhones
        });
      }
    });
}