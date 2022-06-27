/*
  Author: Abdelrahman Hany
  Created on: 23-May-2022
*/

const mongoose = require("mongoose");
const schema = mongoose.Schema;

const schema_ = new schema({
    token: {
        type: String,
        index: true
    },
    user: {
        type: schema.Types.ObjectId,
        ref: "User",
        index: true
    }
}, 
{
    timestamps: true
});

schema_.index({createdAt: -1});

module.exports = mongoose.model("Token", schema_);