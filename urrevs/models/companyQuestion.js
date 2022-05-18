/*
  Author: Abdelrahman Hany
  Created on: 18-May-2022
*/

const mongoose = require("mongoose");
const schema = mongoose.Schema;

const QuestionSchema = new schema({
    user: {
        type: schema.Types.ObjectId,
        required: true,
        ref: "User"
    },
    company: {
        type: schema.Types.ObjectId,
        ref: "Company",
        required: true
    },
    content: {
        type: String,
        required: true
    },
    acceptedAns: {
        type: schema.Types.ObjectId,
        ref: "pAns",
    },
    upvotes: {
        type: Number,
        default: 0
    },
    ansCount: {
        type: Number,
        default: 0
    },
    shareCount: {
        type: Number,
        default: 0
    }
},
{
    timestamps: true
});


QuestionSchema.index({createdAt: -1});

module.exports = mongoose.model("cQues", QuestionSchema);