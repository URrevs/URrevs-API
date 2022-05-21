/*
  Author: Abdelrahman Hany
  Created on: 29-Apr-2022
*/

const mongoose = require("mongoose");
const schema = mongoose.Schema;

const competitionSchema = new schema({
    numWinners: {
        type: Number
    },
    prize: {
        type: String
    },
    prizePic: {
        type: String
    },
    deadline: {
        type: Date
    }
}, 
{
    timestamps: true
});

competitionSchema.index({createdAt: -1});

module.exports = mongoose.model("Competition", competitionSchema);