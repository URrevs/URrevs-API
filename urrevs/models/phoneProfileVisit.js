/*
  Author: Abdelrahman Hany
  Created on: 29-Apr-2022
*/

const mongoose = require("mongoose");
const schema = mongoose.Schema;

const pProfileVisitsSchema = new schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    phone: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Phone"
    }
}, 
{
    timestamps: true
});

pProfileVisitsSchema.index({createdAt: 1});

module.exports = mongoose.model("PhoneProfileVisit", pProfileVisitsSchema);