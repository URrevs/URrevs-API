/*
  Author: Abdelrahman Hany
  Created on: 3-May-2022
*/

const mongoose = require('mongoose');
const schema = mongoose.Schema;

const pRevsLikesSchema = new schema({
    user: {
      type: schema.Types.ObjectId,
      ref: 'User'
    },
    review: {
      type: schema.Types.ObjectId,
      ref: 'cRev'
    },
    unliked: {
      type: Boolean,
      default: false
    }
},
{
  timestamps: true
});

pRevsLikesSchema.index({createdAt: 1});
pRevsLikesSchema.index({user: 1, review: 1});

module.exports = mongoose.model('cRevsLike', pRevsLikesSchema);