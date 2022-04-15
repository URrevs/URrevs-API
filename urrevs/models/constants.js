/*
  Author: Abdelrahman Hany
  Created on: 15-Apr-2022
*/

const mongoose = require("mongoose");
const schema = mongoose.Schema;

const constantsSchema = new schema({
    type: {
        type: String,
        index: true
    },
    value: {
        type: Number
    }
});

module.exports = mongoose.model("Constant", constantsSchema);