/*
  Author: Abdelrahman Hany
  Created on: 8-Apr-2022
*/

const mongoose = require("mongoose");
const schema = mongoose.Schema;

const companiesSchema = new schema({
    _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company"
    }
});

const phonesSchema = new schema({
    _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Phone"
    }
});

const updateSchema = new schema({
    phones: [phonesSchema],
    companies: [companiesSchema],
    isUpdating: {
        type: Boolean,
        default: true
    },
    failed: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date
    },
    automatic: {
        type: Boolean
    }
});

updateSchema.index({createdAt: -1});

module.exports = mongoose.model("Update", updateSchema);