/*
  Author: Abdelrahman Hany
  Created on: 29-Apr-2022
*/

const mongoose = require("mongoose");
const schema = mongoose.Schema;

const questionsAboutMyPhonesVisitSchema = new schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
}, 
{
    timestamps: true
});

questionsAboutMyPhonesVisitSchema.index({createdAt: 1});

module.exports = mongoose.model("QuestionsAboutMyPhonesVisit", questionsAboutMyPhonesVisitSchema);