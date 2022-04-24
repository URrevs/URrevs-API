const cron = require("node-cron");
const CONSTANT = require("../models/constants");
const axios = require("axios");
const config = require("../config");
const https = require("https");

module.exports = ()=>{
    cron.schedule("00 03 * * *", ()=>{  // Every day at 3:00 AM
        // Get latest conversions from EUR to EGP
        let TIMEOUT = parseInt(process.env.TIMEOUT) || config.TIMEOUT;
        let rates, oneEur, oneEgp, eurToEgp;
        
        axios.get(config.EXCHANGE_RATES_API+"/latest", {params: {access_key: (process.env.EXCHANGE_RATES_ACCESS_KEY2), symbols:"EGP,EUR"}}, 
        {timeout: TIMEOUT, httpsAgent: new https.Agent({ keepAlive: true })}).then(({data: exRates})=>{
            rates = exRates.rates;
            oneEur = rates.EUR;
            oneEgp = rates.EGP;
            eurToEgp = oneEgp / oneEur;

            CONSTANT.findOneAndUpdate({name: "EURToEGP"}, [{$set: {value: eurToEgp.toString(), date: new Date()}}], {upsert: true}).then(()=>{
                console.log("End of scheduled EUR to EGP currency update (SUCCESS)..........................");
            })
            .catch((e)=>{
                console.log("End of scheduled EUR to EGP currency update (FAILURE)..........................");
            });
        }).catch((e)=>{
            console.log("End of scheduled EUR to EGP currency update (FAILURE)..........................");
        });
    });
};