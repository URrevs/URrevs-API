/*
  Author: Abdelrahman Hany
  Created on: 20-May-2022
*/

const mongoose = require("mongoose");
const schema = mongoose.Schema;

const trackSchema = new schema({
    user: {
        type: schema.Types.ObjectId,
        ref: "User",
    },
    question: {
        type: schema.Types.ObjectId,
        ref: "pQues"
    },
    times: {
        type: Number,
        default: 1
    }
},
{
    timestamps: true
});


trackSchema.index({updatedAt: 1});
trackSchema.index({user:1, question: 1});

module.exports = mongoose.model("pQuesFullScreen", trackSchema);