/*
  Author: Abdelrahman Hany
  Created on: 23-May-2022
*/

const mongoose = require("mongoose");
const schema = mongoose.Schema;

const reportSchema = new schema({
    closed:{
        type:Boolean,
        default: false,
        index: true
    },
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
        type: Number,
        enum: [1, 2, 3, 4, 5, 6]
    },
    info: {
        type: String
    },
    obj: {
        type: schema.Types.ObjectId,
        refPath: "onModelObj" 
    },
    parObj: {
        type: schema.Types.ObjectId,
        refPath: "onModelParObj" 
    },
    par2Obj: {
        type: schema.Types.ObjectId,
        refPath: "onModelPar2Obj" 
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
    },
    onModelPar2Obj: {
        type: String,
        enum: [
            "pRev", "cRev", 
            "pQues", "cQues", 
            "pRevsComment", "cRevsComment",
            "pQuesAnswer", "cQuesAnswer"
        ]
    },
    blockUser: {
        type: Boolean,
        default: false
    },
    hideContent: {
        type: Boolean,
        default: false
    }
},
{timestamps: true}
);

reportSchema.index({reporter: 1, obj: 1});
reportSchema.index({createdAt: -1});

module.exports = mongoose.model("Report", reportSchema);