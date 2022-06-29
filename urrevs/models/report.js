/*
  Author: Abdelrahman Hany
  Created on: 23-May-2022
*/

const mongoose = require("mongoose");
const schema = mongoose.Schema;

const reportSchema = new schema({
    reporter: {
        type: schema.Types.ObjectId,
        ref: "User",
    },
    reportee: {
        type: schema.Types.ObjectId,
        ref: "User",
    },
    type: {
        type: String,
        enum: [
            "phoneReview", "companyReview", 
            "phoneQuestion", "companyQuestion", 
            "phoneComment", "companyComment",
            "phoneAnswer", "companyAnswer",
            "phoneCommentReply", "companyCommentReply",
            "phoneAnswerReply", "companyAnswerReply"
        ],
    },
    reason: {
        type: String,
        enum: ["disturbance", "violence", "harassment", "hate", "porn", "other"],
    },
    info: {
        type: String
    },
    obj: {
        type: schema.Types.ObjectId,
        refPath: "onModel" 
    },
    parentObj: {
        type: schema.Types.ObjectId,
        refPath: "onModelParObj" 
    },
    onModelObj: {
        type: String,
        enum: [
            "pRev", "cRev", 
            "pQues", "cQues", 
            "pRevsComment", "cRevsComment",
            "pQuesAnswer", "cQuesAnswer"
        ]
    },
    onModelParObj: {
        type: String,
        enum: [
            "pRev", "cRev", 
            "pQues", "cQues", 
            "pRevsComment", "cRevsComment",
            "pQuesAnswer", "cQuesAnswer"
        ]
    }
},
{timestamps: true});


module.exports = mongoose.model("Report", reportSchema);