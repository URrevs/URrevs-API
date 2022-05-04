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
        ref: 'cRev'
    }
},
{
    timestamps: true
});


revsUnlikesSchema.index({createdAt: 1});

module.exports = mongoose.model('cRevsUnlike', revsUnlikesSchema);