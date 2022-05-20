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
    },
    times: {
        type: Number,
        default: 1
    }
}, 
{
    timestamps: true
});

pProfileVisitsSchema.index({updatedAt: 1});
pProfileVisitsSchema.index({user: 1, phone: 1});

module.exports = mongoose.model("PhoneProfileVisit", pProfileVisitsSchema);