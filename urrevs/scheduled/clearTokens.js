/*
  Author: Abdelrahman Hany
  Created on: 23-May-2022
*/

const cron = require("node-cron");
const TOKEN = require("../models/tokens");

const config = require("../config");

let EXPIREATION = (process.env.JWT_EXPIRES_IN || config.JWT_EXPIRES_IN); // must be in the form of "<num_hours>h"
let tokenDurationHours =  EXPIREATION.substring(0, EXPIREATION.length-1);

let threshDate = new Date();
threshDate.setHours(threshDate.getHours() - parseInt(tokenDurationHours));

let cronPattern = "00 */" + tokenDurationHours + " * * *";

module.exports = () => {
    cron.schedule(cronPattern, ()=>{
        console.log("Clearing expired tokens...");
        TOKEN.deleteMany({createdAt: {$lte: threshDate}}).then((resp)=>{
            console.log("Clearing expired tokens succeeded");
        })
        .catch((err)=>{
            console.log("Clearing expired tokens FAILED: ", err);
        });
    });
}