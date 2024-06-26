/*
  Author: Abdelrahman Hany
  Created on: 16-Apr-2022
*/

const cron = require("node-cron");
const updateData = require("../utils/updateData");

const COMPANY = require("../models/company");
const NEWPHONE = require("../models/newPhone");
const PHONE = require("../models/phone");
const PSPECS = require("../models/phoneSpecs");
const UPDATE = require("../models/update");
const config = require("../config");

module.exports = ()=>{
    cron.schedule((process.env.UPDATE_DATA_SCHEDULE_PATTERN || config.UPDATE_DATA_SCHEDULE_PATTERN), ()=>{ // On the first day of each month at 3:00 AM
        updateData.updatePhonesFromSource(COMPANY, PHONE, PSPECS, NEWPHONE, UPDATE, true).then((newItems)=>{
            console.log("End of scheduled update process (SUCCESS)..........................");
        })
        .catch((e)=>{
            console.log("End of scheduled update process (FAILURE)..........................", e);
        });
    });
}