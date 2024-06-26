/*
  Author: Abdelrahman Hany
  Created on: 18-May-2022
*/

const mongoose = require('mongoose');
const schema = mongoose.Schema;

const quesLikesSchema = new schema({
    user: {
      type: schema.Types.ObjectId,
      ref: 'User'
    },
    question: {
      type: schema.Types.ObjectId,
      ref: 'pQues'
    },
    unliked: {
      type: Boolean,
      default: false
    }
},
{
  timestamps: true
});

quesLikesSchema.index({updatedAt: 1});
quesLikesSchema.index({user: 1, question: 1});

module.exports = mongoose.model('pQuesLike', quesLikesSchema);