/*
  Author: Abdelrahman Hany
  Created on: 22-Apr-2022
*/

const cors = require("cors");
const CONSTANT = require("../models/constants");

const corsOptions = async(req, callback)=>{
    let whitelist = [];
    try{
        // getting allowd domains from the DB. AllowedDomains are one string separated by ","
        let allowed = await CONSTANT.findOne({name: "AllowedDomains"}); // don't forget to add front domain to the allowed domains in the first time you created it
        whitelist = allowed.value.split(",");
        whitelist.push(process.env.FRONT_DOMAIN);
    }
    catch(err){
        // making sure that the front-end domain is in the whitelist
        whitelist = [process.env.FRONT_DOMAIN];
    }

    if(whitelist.indexOf(req.header('Origin')) !== -1){
        callback(null, {origin: true});
    }
    else{
        callback(null, {origin: false});
    }
}

// only allow our front domain to access the api
exports.corsUsOnly = cors({origin: [(process.env.FRONT_DOMAIN)]});

// for future use to allow other specific domains (along with our front domain) to access the API
exports.corsUsAndSpecificOthers = cors(corsOptions);