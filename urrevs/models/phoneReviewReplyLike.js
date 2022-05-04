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
    reply: {
        type: schema.Types.ObjectId,
        ref: 'pRevsComment.replies',
    }
},
{
    timestamps: true
});

likeSchema.index({user: 1, reply: 1});

module.exports = mongoose.model("pRevsReplyLike", likeSchema);