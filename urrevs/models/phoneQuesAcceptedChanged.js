/*
  Author: Abdelrahman Hany
  Created on: 18-May-2022
*/

const mongoose = require('mongoose');
const schema = mongoose.Schema;

const quesSchema = new schema({
    user: {
      type: schema.Types.ObjectId,
      ref: 'User'
    },
    question: {
      type: schema.Types.ObjectId,
      ref: 'pQues'
    }
},
{
  timestamps: true
});

quesSchema.index({createdAt: 1});
quesSchema.index({user: 1, question: 1, createdAt: -1});

module.exports = mongoose.model('pQuesAcceptedChanged', quesSchema);