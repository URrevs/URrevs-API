/*
  Author: Abdelrahman Hany
  Created on: 18-May-2022
*/

const mongoose = require("mongoose");
const schema = mongoose.Schema;

const phoneQuestionSchema = new schema({
    user: {
        type: schema.Types.ObjectId,
        required: true,
        ref: "User"
    },
    phone: {
        type: schema.Types.ObjectId,
        ref: "Phone",
        required: true
    },
    content: {
        type: String,
        required: true
    },
    acceptedAns: {
        type: schema.Types.ObjectId,
        ref: "pQuesAnswer",
    },
    upvotes: {
        type: Number,
        default: 0
    },
    ansCount: {
        type: Number,
        default: 0
    },
    shares: {
        type: Number,
        default: 0
    }
},
{
    timestamps: true
});


phoneQuestionSchema.index({createdAt: -1});
phoneQuestionSchema.index({phone: 1, upvotes: -1, createdAt: -1});
phoneQuestionSchema.index({user: 1, upvotes: -1, createdAt: -1});
phoneQuestionSchema.index({user: 1, phone: 1, acceptedAns: 1, upvotes: -1, createdAt: -1});

module.exports = mongoose.model("pQues", phoneQuestionSchema);
