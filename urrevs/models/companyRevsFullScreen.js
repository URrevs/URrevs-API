/*
  Author: Abdelrahman Hany
  Created on: 5-May-2022
*/

const mongoose = require("mongoose");
const schema = mongoose.Schema;

const trackSchema = new schema({
    user: {
        type: schema.Types.ObjectId,
        ref: "User",
    },
    review: {
        type: schema.Types.ObjectId,
        ref: "cRev"
    }
},
{
    timestamps: true
});


trackSchema.index({createdAt: 1});
trackSchema.index({user:1, review: 1, createdAt: -1});

module.exports = mongoose.model("cRevsFullScreen", trackSchema);