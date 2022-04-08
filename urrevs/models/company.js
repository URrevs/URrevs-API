/*
  Author: Abdelrahman Hany
  Created on: 8-Apr-2022
*/

const mongoose = require("mongoose");
const schema = mongoose.Schema;


const companySchema = new schema({
    name:{
        type: String,
    },
    views:{
        type: Number,
        default: 0
    },
    avgRating: {
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model("Company", companySchema);