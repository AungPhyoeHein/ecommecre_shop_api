const mongoose = require('mongoose');

const cartProductSchema = mongoose.Schema({
    product: {type: mongoose.Schema.ObjectId,ref: 'Product',required: true},
    quantity: {type: Number,default:1},
    selectedSize: String,
    selectedColor: String,
    productName: {type:String,required: true},
    productImage: {type:String,required: true},
    productPrice: {type:String,required: true},
    reservationExpiry: {
        type: Date,
        default: ()=> new Date(Date.now() + 30 * 60 * 1000),
    },
    reserved: { type: Boolean, default: true},
})

const CartProduct = mongoose.model('CartProduct',cartProductSchema);

module.exports = CartProduct;