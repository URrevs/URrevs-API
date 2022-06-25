/*
  Author: Abdelrahman Hany
  Created on: 10-Jun-2022
*/

const PHONE = require("../models/phone");
const axios = require("axios");
const https = require("https");

const config = require("../config");

module.exports = (useragent, modelName, itemsPerRound, roundNum, verify)=>{
    let URL = process.env.USER_AGENT_USER_STACK_API;
    let key = process.env.USER_AGENT_USER_STACK_API_KEY
    let TIMEOUT = parseInt(process.env.TIMEOUT) || config.TIMEOUT;
    
    return new Promise(async(resolve, reject)=>{
        try{
            const {data: resp} = await axios.get(URL, {params: {access_key: key, fields:"device", ua: useragent}}, {timeout: TIMEOUT, httpsAgent: new https.Agent({ keepAlive: true })});
            let phoneName = resp.device.brand + " " + resp.device.name;

            phoneName = phoneName.trim();
  
            // replace multiple spaces with single space then convert to array
            phoneName = phoneName.replace(/\s+/g, " "); 
            phoneName = phoneName.split("");
            
            // add braces to each word in search word then join the words together
            phoneName = phoneName.map((word)=>{
              word = "[{(" + word + ")}]";
              return word;
            });
            phoneName = phoneName.join(" ");
            
            // escaping special characters
            phoneName = phoneName.replace(/[\[\]\\^$*+?.()|{}]/g, "\\$&");
          
            // replace any space with any number of spaces
            phoneName = phoneName.replace(/\s+/g, "\\s*"); 
          
            // allowing any number of round brackets
            phoneName = phoneName.replace(/\(/g, "(*");
            phoneName = phoneName.replace(/\)/g, ")*");
          
            // allowing any number of square brackets
            phoneName = phoneName.replace(/\[/g, "[*");
            phoneName = phoneName.replace(/\]/g, "]*");
          
            // allowing any number of curly brackets
            phoneName = phoneName.replace(/\{/g, "{*");
            phoneName = phoneName.replace(/\}/g, "}*");

            let updateRes = await PHONE.updateMany({name: {$regex: new RegExp(phoneName, "i")}}, [{$set: {otherNames: {$concat: ["$otherNames", modelName]}}}]);
            
            if(updateRes.modifiedCount > 0){
                if(verify){
                    let phonesDocs = await PHONE.find({otherNames: {$regex: modelName, $options: "i"}}, {name: 1});
                    let result = [];
                    
                    for(let phone of phonesDocs){
                        result.push({
                            _id: phone._id,
                            name: phone.name,
                        });
                    }
    
                    return resolve(result);
                }
                else{
                    let phonesDocs = await PHONE.find({otherNames: {$regex: modelName, $options: "i"}}, {name: 1, picture: 1, company: 1}).skip((roundNum - 1) * itemsPerRound).limit(itemsPerRound).populate("company", {name: 1});
                    let result = [];
                    
                    for(let phone of phonesDocs){
                        result.push({
                            _id: phone._id,
                            name: phone.name,
                            picture: phone.picture,
                            companyId: phone.company._id,
                            companyName: phone.company.name,
                            type: "phone"
                        });
                    }
    
                    return resolve(result);
                }
            }
            else{
                // the phone is not in the database
                return reject(404);
            }
        }
        catch(err){
            if(err && err.response && err.response.status && err.response.data){
                // axios error
                return reject({status: err.response.status, data: err.response.data});
            }
            
            return reject(err);
        }
    });
}