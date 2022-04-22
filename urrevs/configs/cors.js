const cors = require("cors");
const CONSTANT = require("../models/constants");
const config = require("../config");

const corsOptions = async(req, callback)=>{
    let whitelist = [];
    try{
        // getting allowd domains from the DB. AllowedDomains are one string separated by ","
        let allowed = await CONSTANT.findOne({name: "AllowedDomains"});
        whitelist = allowed.value.split(",");
    }
    catch(err){
        // making sure that the front-end domain is in the whitelist
        whitelist = [process.env.FRONT_DOMAIN || config.FRONT_DOMAIN];
    }

    if(whitelist.indexOf(req.header('Origin')) !== -1){
        callback(null, {origin: true});
    }
    else{
        callback(null, {origin: false});
    }
}

exports.corsUsOnly = cors({origin: "*"});   // TODO: (PRODUCTION) Change this to the domain of the web frontend (https://urrevs.com)
exports.corsUsAndSpecificOthers = cors(corsOptions);    // for future use to allow specific domains to access the API