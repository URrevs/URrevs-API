/*
  Author: Abdelrahman Hany
  Created on: 29-Apr-2022
*/

const mongoose = require("mongoose");
const schema = mongoose.Schema;

const pComparisonSchema = new schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    srcPhone: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Phone"
    },
    dstPhone: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Phone"
    },
    times: {
        type: Number,
        default: 1
    }
}, 
{
    timestamps: true
});

pComparisonSchema.index({updatedAt: 1});

module.exports = mongoose.model("PhoneComparison", pComparisonSchema);