const mongoose = require('mongoose');

const orderItemSchema = mongoose.Schema({
    product: {
        type: mongoose.Schema.ObjectId,
        ref: 'Product',
        required:true,
    },
    productName: {
        type: String,
        required: true,
    },
    productImage: {
        type: String,
        required: true,
    },
    productPrice: {
        type: Number,
        required: true,
    },
    quantity: {
        type: Number,
        default: 1,
    },
    selectedSize: String,
    selectedColor: String,
})

orderItemSchema.set('toObject',{virtuals: true});
orderItemSchema.set('toJSON',{virtuals:true});

const OrderItem = mongoose.model('OrderItem',orderItemSchema)

module.exports = OrderItem;