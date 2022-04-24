/*
  Author: Abdelrahman Hany
  Created on: 15-Apr-2022
*/

const mongoose = require("mongoose");
const schema = mongoose.Schema;

const constantsSchema = new schema({
    name: {
        type: String,
        index: true
    },
    value: {
        type: String
    },
    date: {
        type: Date
    }
});

module.exports = mongoose.model("Constant", constantsSchema);