const cron = require("node-cron");
const CONSTANT = require("../models/constants");
const axios = require("axios");
const config = require("../config");
const https = require("https");

const delay = (milliseconds)=>{
    return new Promise((resolve, reject)=>{
        setTimeout(()=>{
            resolve();
        }, milliseconds);
    });
}


module.exports = ()=>{
    cron.schedule(process.env.CURRENCY_UPDATE_SCHEDULE_PATTERN , async()=>{  // Every day at 3:00 AM
        // Get latest conversions from EUR to EGP
        let TIMEOUT = parseInt(process.env.TIMEOUT) || config.TIMEOUT;
        let rates, oneEur, oneCurr, eurToCurr;
        
        // convert from EUR to EGP
        try{
            let {data: exRates} = await axios.get(config.EXCHANGE_RATES_API+"/latest", {params: {access_key: (process.env.EXCHANGE_RATES_ACCESS_KEY2), symbols:"EGP,EUR"}}, 
                {timeout: TIMEOUT, httpsAgent: new https.Agent({ keepAlive: true })});
            rates = exRates.rates;
            oneEur = rates.EUR;
            oneCurr = rates.EGP;
            eurToCurr = oneCurr / oneEur;

            // update the conversion rate in the database
            try{
                await CONSTANT.findOneAndUpdate({name: "EURToEGP"}, [{$set: {value: eurToCurr.toString(), date: new Date()}}], {upsert: true});
                console.log("End of scheduled EUR to EGP currency update (SUCCESS)..........................");
            }
            catch(err){
                console.log("End of scheduled EUR to EGP currency update (FAILURE)..........................");
            }
        }
        catch(err){
            console.log("End of scheduled EUR to EGP currency update (FAILURE)..........................");
        }

        // //-------------------------------------------------------------------------------------
        // await delay(1000);
        // //-------------------------------------------------------------------------------------

        // // convert from INR to EUR
        // try{
        //     let {data: exRates} = await axios.get(config.EXCHANGE_RATES_API+"/latest", {params: {access_key: (process.env.EXCHANGE_RATES_ACCESS_KEY2), symbols:"INR,EUR"}}, 
        //         {timeout: TIMEOUT, httpsAgent: new https.Agent({ keepAlive: true })});
        //     rates = exRates.rates;
        //     oneEur = rates.EUR;
        //     oneCurr = rates.INR;
        //     eurToCurr = oneEur / oneCurr;

        //     // update the conversion rate in the database
        //     try{
        //         await CONSTANT.findOneAndUpdate({name: "INRToEUR"}, [{$set: {value: eurToCurr.toString(), date: new Date()}}], {upsert: true});
        //         console.log("End of scheduled INR to EUR currency update (SUCCESS)..........................");
        //     }
        //     catch(err){
        //         console.log("End of scheduled INR to EUR currency update (FAILURE)..........................");
        //     }
        // }
        // catch(err){
        //     console.log("End of scheduled INR to EUR currency update (FAILURE)..........................");
        // }

        // //-------------------------------------------------------------------------------------
        // await delay(1000);
        // //-------------------------------------------------------------------------------------

        // // convert from GBP to EUR
        // try{
        //     let {data: exRates} = await axios.get(config.EXCHANGE_RATES_API+"/latest", {params: {access_key: (process.env.EXCHANGE_RATES_ACCESS_KEY2), symbols:"GBP,EUR"}}, 
        //                 {timeout: TIMEOUT, httpsAgent: new https.Agent({ keepAlive: true })});
        //     rates = exRates.rates;
        //     oneEur = rates.EUR;
        //     oneCurr = rates.GBP;
        //     eurToCurr = oneEur / oneCurr;

        //     // update the conversion rate in the database
        //     try{
        //         await CONSTANT.findOneAndUpdate({name: "GBPToEUR"}, [{$set: {value: eurToCurr.toString(), date: new Date()}}], {upsert: true});
        //         console.log("End of scheduled GBP to EUR currency update (SUCCESS)..........................");
        //     }
        //     catch(err){
        //         console.log("End of scheduled GBP to EUR currency update (FAILURE)..........................");
        //     }
        // }
        // catch(err){
        //     console.log("End of scheduled GBP to EUR currency update (FAILURE)..........................");
        // }

        // //-------------------------------------------------------------------------------------
        // await delay(1000);
        // //-------------------------------------------------------------------------------------

        // // convert from USD to EUR
        // try{
        //     let {data: exRates} = await axios.get(config.EXCHANGE_RATES_API+"/latest", {params: {access_key: (process.env.EXCHANGE_RATES_ACCESS_KEY2), symbols:"USD,EUR"}}, 
        //                         {timeout: TIMEOUT, httpsAgent: new https.Agent({ keepAlive: true })});
        //     rates = exRates.rates;
        //     oneEur = rates.EUR;
        //     oneCurr = rates.USD;
        //     eurToCurr = oneEur / oneCurr;

        //     // update the conversion rate in the database
        //     try{
        //         await CONSTANT.findOneAndUpdate({name: "USDToEUR"}, [{$set: {value: eurToCurr.toString(), date: new Date()}}], {upsert: true});
        //         console.log("End of scheduled USD to EUR currency update (SUCCESS)..........................");
        //     }
        //     catch(err){
        //         console.log("End of scheduled USD to EUR currency update (FAILURE)..........................");
        //     }
        // }
        // catch(err){
        //     console.log("End of scheduled USD to EUR currency update (FAILURE)..........................");
        // }
    });
};