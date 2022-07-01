/*
  Author: Abdelrahman Hany
  Created on: 1-Jul-2022
*/

const cron = require("node-cron");
const axios = require("axios");
const https = require("https");

const config = require("../config");

module.exports = ()=>{
    cron.schedule((process.env.AI_TRAINING_SCHEDULE_PATTERN || config.AI_TRAINING_SCHEDULE_PATTERN) , async()=>{
        let TIMEOUT = process.env.TIMEOUT || config.TIMEOUT;
        axios.get(process.env.AI_LINK + "/training/start?first=0",
            {headers: {'X-Api-Key': process.env.AI_API_KEY}},
            {timeout: TIMEOUT, httpsAgent: new https.Agent({ keepAlive: true })})
        .then(()=>{
            console.log("End of scheduled AI training (SUCCESS)..........................");
        })
        .catch((err)=>{
            console.log("End of triggering scheduled training (FAILURE)..........................", err);
        });
    });
};