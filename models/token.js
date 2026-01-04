const mongoose = require('mongoose');

const tokenSchema = mongoose.Schema({
    userId: {
        type:mongoose.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    refreshToken: {type: String,required: true},
    accessToken: {
        type: String,
        index: true,
    },
    createdAt:{type:Date,default: Date.now,expires: 60 * 86400}
})

const Token = mongoose.model('Token',tokenSchema);
module.exports = Token;