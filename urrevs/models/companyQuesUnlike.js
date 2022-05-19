/*
  Author: Abdelrahman Hany
  Created on: 18-May-2022
*/

const mongoose = require('mongoose');
const schema = mongoose.Schema;

const quesUnlikesSchema = new schema({
    user: {
        type: schema.Types.ObjectId,
        ref: 'User'
    },
    question: {
        type: schema.Types.ObjectId,
        ref: 'cQues'
    }
},
{
    timestamps: true
});


quesUnlikesSchema.index({createdAt: 1});
quesUnlikesSchema.index({user: 1, question: 1, createdAt: -1});

module.exports = mongoose.model('cQuesUnlike', quesUnlikesSchema);