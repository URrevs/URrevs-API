/*
  Author: Abdelrahman Hany
  Created on: 1-May-2022
*/

const mongoose = require("mongoose");
const schema = mongoose.Schema;

const cReviewSchema = new schema({
    // basic
    user: {
        type: schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    company: {
        type: schema.Types.ObjectId,
        ref: "Company",
        required: true
    },
    corresPrev: {
        type: schema.Types.ObjectId,
        ref: "pReview",
        required: true
    },
    // ratings
    generalRating: {
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

cReviewSchema.index({createdAt: -1});
cReviewSchema.index({user: 1, likes: -1, createdAt: -1});
cReviewSchema.index({company: 1, likes: -1, createdAt: -1});

module.exports = mongoose.model("cRev", cReviewSchema);