/*
  Author: Abdelrahman Hany
  Created on: 4-May-2022
*/

const mongoose = require('mongoose');
const schema = mongoose.Schema;

const repliesSchema = new schema({
    user: {
        type: schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    likes: {
        type: Number,
        default: 0,
        min: 0
    },
    content: {
        type: String,
        required: true
    },
    hidden: {
        type: Boolean,
        default: false
    }
},
{
    timestamps: true
});

const commentsSchema = new schema({
    user: {
        type: schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    review: {
        type: schema.Types.ObjectId,
        ref: 'pRev',
        required: true
    },
    likes: {
        type: Number,
        default: 0,
        min: 0
    },
    content: {
        type: String,
        required: true
    },
    replies: [repliesSchema],
    hidden: {
        type: Boolean,
        default: false
    }
},
{
    timestamps: true
});


commentsSchema.index({createdAt: 1});
commentsSchema.index({review: 1, likes: -1, createdAt: -1});

module.exports = mongoose.model('pRevsComment', commentsSchema);