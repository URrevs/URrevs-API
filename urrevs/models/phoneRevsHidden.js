/*
  Author: Abdelrahman Hany
  Created on: 9-Jul-2022
*/

const mongoose = require("mongoose");
const schema = mongoose.Schema;

const hiddenSchema = new schema({
    review: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "pRev"
    }
}, { timestamps: true });

hiddenSchema.index({createdAt: -1});

module.exports = mongoose.model("pRevsHidden", hiddenSchema);