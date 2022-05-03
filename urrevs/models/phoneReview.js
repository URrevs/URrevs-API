/*
  Author: Abdelrahman Hany
  Created on: 1-May-2022
*/

const mongoose = require("mongoose");
const schema = mongoose.Schema;

const pReviewSchema = new schema({
    // basic
    user: {
        type: schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    phone: {
        type: schema.Types.ObjectId,
        ref: "Phone",
        required: true
    },
    ownedDate: {
        type: Date,
        required: true
    },
    // ratings
    generalRating: {
        type: Number,
        required: true
    },
    uiRating: {
        type: Number,
        required: true
    },
    manQuality: {
        type: Number,
        required: true
    },
    valFMon: {
        type: Number,
        required: true
    },
    camera: {
        type: Number,
        required: true
    },
    callQuality: {
        type: Number,
        required: true
    },
    batteryRating: {
        type: Number,
        required: true
    },
    // review
    pros: {
        type: String,
        required: true
    },
    cons: {
        type: String,
        required: true
    },
    // metadata
    views: {
        type: Number,
        default: 0
    },
    likes: {
        type: Number,
        default: 0
    },
    commentsCount: {
        type: Number,
        default: 0
    },
    shares: {
        type: Number,
        default: 0
    }
},
{
    timestamps: true
});

pReviewSchema.index({createdAt: -1});
pReviewSchema.index({phone: 1, createdAt: -1});
pReviewSchema.index({user: 1, createdAt: -1});

module.exports = mongoose.model("pReview", pReviewSchema);