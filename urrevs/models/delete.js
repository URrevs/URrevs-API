/*
  Author: Abdelrahman Hany
  Created on: 9-Jul-2022
*/

const mongoose = require("mongoose");
const schema = mongoose.Schema;

const deleteSchema = new schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    closed: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

deleteSchema.index({closed: 1, createdAt: -1});

module.exports = mongoose.model("Delete", deleteSchema);