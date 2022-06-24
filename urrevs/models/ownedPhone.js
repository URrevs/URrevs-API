/*
  Author: Abdelrahman Hany
  Created on: 28-Apr-2022
*/

const mongoose = require("mongoose");
const schema = mongoose.Schema;

const ownedPhonesSchema = new schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    phone: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Phone",
        required: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true
    },
    ownedAt: {
        type: Date,
        required: true
    },
    verificationRatio: {
        /*
            positive: android,
            negative: ios
            zero: not verified
        */
        type: Number,
        default: 0
    }
});

ownedPhonesSchema.index({user: 1, ownedAt: -1});
ownedPhonesSchema.index({user: 1, phone: 1});
ownedPhonesSchema.index({user: 1, company: 1});

module.exports = mongoose.model("OwnedPhone", ownedPhonesSchema);