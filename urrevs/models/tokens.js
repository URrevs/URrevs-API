/*
  Author: Abdelrahman Hany
  Created on: 23-May-2022
*/

const mongoose = require("mongoose");
const schema = mongoose.Schema;

const schema_ = new schema({
    _id: {
        type: String
    },
    user: {
        type: schema.Types.ObjectId,
        ref: "User"
    }
}, 
{
    timestamps: true
});

schema_.index({createdAt: -1});

module.exports = mongoose.model("Token", schema_);