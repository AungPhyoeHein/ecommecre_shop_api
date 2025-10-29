const mongoose = require("mongoose");

const reviewSchema = mongoose.Schema({
    user: {type:mongoose.Schema.Types.ObjectId, ref: 'User',required: true},
    userName: {type: String, required: true},
    comment: {type: String,trim: true},
    rating: {type: Number,required: true},
    date: {type: Date,default: Date.now},
},{
        timestamps: true
    });

reviewSchema.set('toObject',{virtuals: true});
reviewSchema.set('toJSON',{virtuals:true});

const Review = mongoose.model('Review',reviewSchema);
module.exports = Review;