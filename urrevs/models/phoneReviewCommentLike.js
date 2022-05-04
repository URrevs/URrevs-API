/*
  Author: Abdelrahman Hany
  Created on: 4-May-2022
*/

const mongoose = require('mongoose');
const schema = mongoose.Schema;

const likeSchema = new schema({
    user: {
        type: schema.Types.ObjectId,
        ref: 'User',
    },
    comment: {
        type: schema.Types.ObjectId,
        ref: 'pRevsComment',
    }
},
{
    timestamps: true
});

likeSchema.index({user: 1, comment: 1});

module.exports = mongoose.model('pRevsCommentLike', likeSchema);