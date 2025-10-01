const mongoose = require('mongoose');

const userSchema = mongoose.Schema(
    {
        name : {
            type: String,
            require: true,
            trim:true
        },
        email: {
            type: String,
            require: true,
            trim: true,
        },
        password: {type: String,require:true,trim: true,select: false},
        street: String,
        apartment: String,
        city: String,
        postalCode: String,
        country: String,
        phone: {type:String,required: true,trim: true},
        isAdmin: {type:Boolean,default: false},
        resetPasswordOtp: {type:Number,select: false},
        resetPasswordOtpExpires:{type: Date,select: false},
        wishlist: [
            {
                productId: {type:mongoose.Schema.Types.ObjectId,ref: 'Product',required:true},
                productName: {type:String,required: true},
                productImage: {type:String,required: true},
                productPrice: {type: Number,required: true}
            }
        ]
    },
    {
        timestamps: true // Add this
    }
);

userSchema.index({email: 1},{unique: true});

const User = mongoose.model('User',userSchema);

module.exports = User;