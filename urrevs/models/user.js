/*
  Author: Abdelrahman Hany
  Created on: 28-Apr-2022
*/

const mongoose = require("mongoose");
const schema = mongoose.Schema;

const userSchema = new schema({
    uid: {
        type: String,
        index: true,
        required: true
    },
    name: {
        type: String,
        required: true,
        index: true
    },
    picture: {
        type: String
    },
    refCode: {
        type: String,
        index: true
    },
    absPoints: {
        type: Number,
        default: 0
    },
    comPoints: {
        type: Number,
        default: 0
    },
    admin: {
        type: Boolean,
        default: false
    },
    loggedInUsingMobile:{
        type: Boolean,
        default: false
    },
    currentRoundForRecommendation: {
        type: Number,
        default: 1
    },
    questionsAnswered: {
        type: Number,
        default: 0
    },
    totalViews: {
        type: Number,
        default: 0
    },
    blockedFromReviews: {
        type: Boolean,
        default: false
    },
    blockedFromQuestions: {
        type: Boolean,
        default: false
    },
    blockedFromComment: {
        type: Boolean,
        default: false
    },
    blockedFromAnswer: {
        type: Boolean,
        default: false
    },
    blockedFromReplyComment: {
        type: Boolean,
        default: false
    },
    blockedFromReplyAnswer: {
        type: Boolean,
        default: false
    }
}, {timestamps: true});

userSchema.index({createdAt: -1});
userSchema.index({comPoints: -1});
userSchema.index({absPoints: -1});

module.exports = mongoose.model("User", userSchema);