/*
  Author: Abdelrahman Hany
  Created on: 29-Apr-2022
*/

const mongoose = require("mongoose");
const schema = mongoose.Schema;

const questionsAboutMyPhonesVisitSchema = new schema({
    _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    numberOfVisits: {
        type: Number,
        default: 1
    }
}, 
{
    timestamps: true
});

questionsAboutMyPhonesVisitSchema.index({updatedAt: 1});

module.exports = mongoose.model("QuestionsAboutMyPhonesVisit", questionsAboutMyPhonesVisitSchema);