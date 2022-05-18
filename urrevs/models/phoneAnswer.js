/*
  Author: Abdelrahman Hany
  Created on: 18-May-2022
*/

const mongoose = require("mongoose");
const schema = mongoose.Schema;


const repliesSchema = new schema({
    user: {
        type: schema.Types.ObjectId,
        required: true,
        ref: "User"
    },
    likes: {
        type: Number,
        default: 0
    },
    content: {
        type: String,
        required: true
    }
},
{
    timestamps: true
});


const phoneAnswerSchema = new schema({
    user: {
        type: schema.Types.ObjectId,
        required: true,
        ref: "User"
    },
    question: {
        type: schema.Types.ObjectId,
        ref: "pQues",
        required: true
    },
    content: {
        type: String,
        required: true
    },
    accepted: {
        type: Boolean,
        default: false
    },
    upvotes: {
        type: Number,
        default: 0
    },
    replies: [repliesSchema]
},
{
    timestamps: true
});

phoneAnswerSchema.index({createdAt: -1});

module.exports = mongoose.model("pAns", phoneAnswerSchema);