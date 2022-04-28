/*
  Author: Abdelrahman Hany
  Created on: 28-Apr-2022
*/

const mongoose = require("mongoose");
const schema = mongoose.Schema;

const recentSearchesSchema = new schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'onModel',
    required: true
  },
  type: {
    type: String,
    required: true
  },
  onModel: {
    type: String,
    enum: ['Phone', 'Company'],
    required: true
  }
});

const uproductsSchema = new schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  recentSearches:[recentSearchesSchema]
});

module.exports = mongoose.model("uproduct", uproductsSchema);