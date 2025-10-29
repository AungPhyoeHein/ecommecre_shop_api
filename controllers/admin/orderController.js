const { Order, OrderItem } = require("../../models");

const getOrders = async (req,res,next) =>{
    try {
        const orders = await Order.find().select('-statusHistory').populate('user','name email').sort({dateOrdered: 1}).populate({path: 'orderItem',populate: {
            path: 'product',
            select: 'name',
            populate:{
                path:'category',
                select: 'name'
            }
        }});
        if(!orders){
            res.code = 404;
            throw new Error("Orders not found");
        }
        return res.json(orders);
    } catch (err) {
        next(err);
    }
}
const getOrdersCount = async (req,res,next) =>{
    try {
        const count = await Order.countDocuments();
        if(!count && count != 0){
            throw new Error("Could not count orders!");
        } 

        return res.json({count});
    } catch (err) {
        next(err);
    }
}
const changeOrderStatus = async (req,res,next) =>{
    try {
        const orderId = req.params.id;
        const newStatus = req.body.status??null;

        if(newStatus === null){
            res.code = 400;
            throw new Error("Status Required.");
        }

        let order = await Order.findById(orderId);
        if(!order){
            res.code = 400;
            throw new Error("Order not found.");
        }

        if(!order.statusHistory.includes(order.status)){
            order.statusHistory.push(order.status);
        }

        order.status = newStatus;
        
        order = await order.save();

        return res.json(order);
    } catch (err) {
        next(err);
    }
}

const deleteOrder = async (req,res,next) => {
    try {
        const order = await Order.findByIdAndDelete(req,params.id);
        if(!order){
            res.code = 404;
            throw new Error("Order not found");
        }
        for(const orderItemId of order.orderItems){
            await OrderItem.findByIdAndDelete(orderItemId);
        }
        return res.status(204).end();
    } catch (err) {
        next(err);
    }
}


module.exports = {getOrders,getOrdersCount,changeOrderStatus,deleteOrder}