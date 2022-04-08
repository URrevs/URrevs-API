/*
  Author: Abdelrahman Hany
  Created on: 8-Apr-2022
*/

const mongoose = require("mongoose");
const schema = mongoose.Schema;

const updateSchema = new schema({
    numPhones: {
        type: Number
    },
    numCompanies: {
        type: Number
    }
}, 
{
    timestamps: true
});

module.exports = mongoose.model("Update", updateSchema);