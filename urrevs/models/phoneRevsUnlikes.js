/*
  Author: Abdelrahman Hany
  Created on: 3-May-2022
*/

const mongoose = require('mongoose');
const schema = mongoose.Schema;

const revsUnlikesSchema = new schema({
    user: {
        type: schema.Types.ObjectId,
        ref: 'User'
    },
    review: {
        type: schema.Types.ObjectId,
        ref: 'pRev'
    }
},
{
    timestamps: true
});


revsUnlikesSchema.index({createdAt: 1});

mongoose.model('pRevsUnlike', revsUnlikesSchema);