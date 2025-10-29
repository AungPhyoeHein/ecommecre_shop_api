const mongoose = require('mongoose');

const orderSchema = mongoose.Schema({
    orderItems: [{
        type: mongoose.Schema.ObjectId,
        ref: 'OrderItem'
    }],
    shippingAddress: {
        type:String,
        required: true,
    },
    city: {
        type:String,
        required: true,
    },
    postalCode: {
        type:String,
        required: true,
    },
    country: {
        type:String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    paymentId: String,
    status: {
        type:String,
        enum: [
            'pending',
            'processed',
            'shipped',
            'out-for-delivery',
            'delivered',
            'cancled',
            'on-hold',
            'expired'
        ],
        required: true,
        default: 'pending',
    },
    statusHistory: {
            type: String,
            enum: [
            'pending',
            'processed',
            'shipped',
            'out-for-delivery',
            'delivered',
            'cancled',
            'on-hold',
            'expired'
        ],
        },
        totalPrice: Number,
        user: {
            type:mongoose.Schema.ObjectId,
            ref: 'User'
        },
        dateOrdered: {
            type:Date,
            default: Date.now()
        }
})

orderSchema.set('toObject',{virtuals: true});
orderSchema.set('toJSON',{virtuals:true});

const Order = mongoose.model('Order',orderSchema);
module.exports = Order;