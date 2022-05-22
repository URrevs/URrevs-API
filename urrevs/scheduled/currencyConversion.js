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
    cron.schedule(process.env.CURRENCY_UPDATE_SCHEDULE_PATTERN , ()=>{  // Every day at 3:00 AM
        // Get latest conversions from EUR to EGP
        let TIMEOUT = parseInt(process.env.TIMEOUT) || config.TIMEOUT;
        let rates, oneEur, oneEgp, eurToEgp;
        
        // convert from EUR to EGP
        axios.get(config.EXCHANGE_RATES_API+"/latest", {params: {access_key: (process.env.EXCHANGE_RATES_ACCESS_KEY2), symbols:"EGP,EUR"}}, 
        {timeout: TIMEOUT, httpsAgent: new https.Agent({ keepAlive: true })}).then(({data: exRates})=>{
            rates = exRates.rates;
            oneEur = rates.EUR;
            oneEgp = rates.EGP;
            eurToEgp = oneEgp / oneEur;

            CONSTANT.findOneAndUpdate({name: "EURToEGP"}, [{$set: {value: eurToEgp.toString(), date: new Date()}}], {upsert: true}).then(async()=>{
                console.log("End of scheduled EUR to EGP currency update (SUCCESS)..........................");
                await delay(1000);
                // convert from INR to EUR
                axios.get(config.EXCHANGE_RATES_API+"/latest", {params: {access_key: (process.env.EXCHANGE_RATES_ACCESS_KEY2), symbols:"INR,EUR"}}, 
                {timeout: TIMEOUT, httpsAgent: new https.Agent({ keepAlive: true })}).then(({data: exRates})=>{
                    rates = exRates.rates;
                    oneEur = rates.EUR;
                    oneEgp = rates.INR;
                    eurToEgp = oneEur / oneEgp;
        
                    CONSTANT.findOneAndUpdate({name: "INRToEUR"}, [{$set: {value: eurToEgp.toString(), date: new Date()}}], {upsert: true}).then(async()=>{
                        console.log("End of scheduled INR to EUR currency update (SUCCESS)..........................");
                        await delay(1000);
                        // convert from GBP to EUR
                        axios.get(config.EXCHANGE_RATES_API+"/latest", {params: {access_key: (process.env.EXCHANGE_RATES_ACCESS_KEY2), symbols:"GBP,EUR"}}, 
                        {timeout: TIMEOUT, httpsAgent: new https.Agent({ keepAlive: true })}).then(({data: exRates})=>{
                            rates = exRates.rates;
                            oneEur = rates.EUR;
                            oneEgp = rates.GBP;
                            eurToEgp = oneEur / oneEgp;
                
                            CONSTANT.findOneAndUpdate({name: "GBPToEUR"}, [{$set: {value: eurToEgp.toString(), date: new Date()}}], {upsert: true}).then(()=>{
                                console.log("End of scheduled GBP to EUR currency update (SUCCESS)..........................");
                                await delay(1000);
                                // convert from GBP to EUR
                                axios.get(config.EXCHANGE_RATES_API+"/latest", {params: {access_key: (process.env.EXCHANGE_RATES_ACCESS_KEY2), symbols:"USD,EUR"}}, 
                                {timeout: TIMEOUT, httpsAgent: new https.Agent({ keepAlive: true })}).then(({data: exRates})=>{
                                    rates = exRates.rates;
                                    oneEur = rates.EUR;
                                    oneEgp = rates.USD;
                                    eurToEgp = oneEur / oneEgp;
                        
                                    CONSTANT.findOneAndUpdate({name: "USDToEUR"}, [{$set: {value: eurToEgp.toString(), date: new Date()}}], {upsert: true}).then(()=>{
                                        console.log("End of scheduled USD to EUR currency update (SUCCESS)..........................");
                                    })
                                    .catch((e)=>{
                                        console.log("End of scheduled USD to EUR currency update (FAILURE)..........................");
                                    });
                                }).catch((e)=>{
                                    console.log("End of scheduled GBP to EUR currency update (FAILURE)..........................");
                                });

                            })
                            .catch((e)=>{
                                console.log("End of scheduled GBP to EUR currency update (FAILURE)..........................");
                            });
                        }).catch((e)=>{
                            console.log("End of scheduled GBP to EUR currency update (FAILURE)..........................");
                        });
                    })
                    .catch((e)=>{
                        console.log("End of scheduled INR to EUR currency update (FAILURE)..........................");
                    });
                }).catch((e)=>{
                    console.log("End of scheduled INR to EUR currency update (FAILURE)..........................");
                });
            })
            .catch((e)=>{
                console.log("End of scheduled EUR to EGP currency update (FAILURE)..........................");
            });
        }).catch((e)=>{
            console.log("End of scheduled EUR to EGP currency update (FAILURE)..........................");
        });
    });
};