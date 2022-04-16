const cron = require("node-cron");
const updateData = require("../utils/updateData");

const COMPANY = require("../models/company");
const NEWPHONE = require("../models/newPhone");
const PHONE = require("../models/phone");
const PSPECS = require("../models/phoneSpecs");
const UPDATE = require("../models/update");

module.exports = ()=>{
    cron.schedule("00 03 1 * *", ()=>{ // On the first day of each month at 3:00 AM
        updateData.updatePhonesFromSource(COMPANY, PHONE, PSPECS, NEWPHONE, UPDATE, true).then((newItems)=>{
            console.log("End of scheduled update process (SUCCESS)..........................");
        })
        .catch((e)=>{
            console.log("End of scheduled update process (FAILURE)..........................");
        });
    });
}