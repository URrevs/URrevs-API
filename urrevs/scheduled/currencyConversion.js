const cron = require("node-cron");
const CONSTANT = require("../models/constants");
const axios = require("axios");
const config = require("../config");
const https = require("https");

module.exports = convertEURtoEGP = ()=>{
    cron.schedule("0 00 * * *", async()=>{  // Every day at 12:00 AM (00:00)
        // Get latest conversions from EUR to EGP
        let TIMEOUT = parseInt(process.env.TIMEOUT) || config.TIMEOUT;
        let rates, oneEur, oneEgp, eurToEgp;
        
        try{
            const {data: exRates} = await axios.get(config.EXCHANGE_RATES_API+"/latest", {params: {access_key: (process.env.EXCHANGE_RATES_ACCESS_KEY2), symbols:"EGP,EUR"}}, {timeout: TIMEOUT, httpsAgent: new https.Agent({ keepAlive: true })});
            rates = exRates.rates;
            oneEur = rates.EUR;
            oneEgp = rates.EGP;
            eurToEgp = oneEgp / oneEur;
            
            await CONSTANT.findOneAndUpdate({name: "EURToEGP"}, {$set: {value: eurToEgp}}, {upsert: true});
            //console.log("SUCCESS");
        }
        catch(e){
            //console.log(e);
        }
    });
};