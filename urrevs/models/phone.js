/*
  Author: Abdelrahman Hany
  Created on: 8-Apr-2022
*/

const mongoose = require("mongoose");
const schema = mongoose.Schema;

const phoneSchema = new schema({
    name: {
        type: String,
        index: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company"
    },
    picture: {
        type: String
    },
    generalRating: {
        type: Number,
        default: 0,
        min: 0
    },
    uiRating: {
        type: Number,
        default: 0,
        min: 0
    },
    manQuality: {
        type: Number,
        default: 0,
        min: 0
    },
    valFMon: {
        type: Number,
        default: 0,
        min: 0
    },
    cam: {
        type: Number,
        default: 0,
        min: 0
    },
    callQuality: {
        type: Number,
        default: 0,
        min: 0
    },
    batteryRating: {
        type: Number,
        default: 0,
        min: 0
    },
    views: {
        type: Number,
        default: 0,
        min: 0
    },
    totalRevsCount: {
        type: Number,
        default: 0
    },
    manual: {
        type: Boolean,
        default: false
    }
}, 
{
    timestamps: true
});

phoneSchema.index({company: 1, createdAt: -1});
phoneSchema.index({createdAt: -1});

module.exports = mongoose.model("Phone", phoneSchema);