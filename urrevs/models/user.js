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
        unique: true,
        required: true
    },
    name: {
        type: String,
        required: true
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
    }
});


module.exports = mongoose.model("User", userSchema);