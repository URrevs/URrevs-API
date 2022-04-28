/*
  Author: Abdelrahman Hany
  Created on: 28-Apr-2022
*/

const mongoose = require("mongoose");
const schema = mongoose.Schema;

const userSchema = new schema({
    firebaseId: {
        type: String,
        index: true
    },
    name: {
        type: String
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
    }
});


module.exports = mongoose.model("User", userSchema);