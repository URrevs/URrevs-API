const PHONE = require("../models/phone");
const axios = require("axios");
const https = require("https");

const config = require("../config");

module.exports = (useragent, modelName, itemsPerRound, roundNum)=>{
    let URL = process.env.USER_AGENT_USER_STACK_API;
    let key = process.env.USER_AGENT_USER_STACK_API_KEY
    let TIMEOUT = parseInt(process.env.TIMEOUT) || config.TIMEOUT;
    
    return new Promise(async(resolve, reject)=>{
        try{
            const {data: resp} = await axios.get(URL, {params: {access_key: key, fields:"device", ua: useragent}}, {timeout: TIMEOUT, httpsAgent: new https.Agent({ keepAlive: true })});
            let phoneName = resp.device.brand + " " + resp.device.name;

            let updateRes = await PHONE.updateMany({name: {$regex: new RegExp(phoneName, "i")}}, [{$set: {otherNames: {$concat: ["$otherNames", "," + modelName]}}}]);
            
            if(updateRes.modifiedCount > 0){
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
            else{
                // the phone is not in the database
                return reject(404);
            }
        }
        catch(err){
            return reject(err);
        }
    });
}