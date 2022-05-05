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
    nameLower:{
        type: String,
        index: true
    },
    views:{
        type: Number,
        default: 0
    },
    avgRating: {
        type: Number,
        default: 0
    },
    totalRevsCount: {
        type: Number,
        default: 0,
        index: true
    },
    picture: {
        type: String
    }
},
{
    timestamps: true
});

module.exports = mongoose.model("Company", companySchema);