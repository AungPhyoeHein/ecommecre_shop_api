const { User,CartProduct,Order,OrderItem,Token } = require("../../models");


const getUserCount = async(req,res,next)=> {
    try {
        const userCount = await User.countDocuments();
        if(!userCount){
            throw new Error("Could not count users.");
        }
        return res.status(200).json({userCount});
    } catch (err) {
        next(err);
    }
}

const deleteUser = async (req,res,next)=> {
    try {
        const userId = req.params.id;

        const user = await User.findOne({_id: userId});
        if(!user) {
            res.code = 404;
            throw new Error("User not found.");
        }

        const orders = await Order.find({user: userId});
        const orderItemIds = orders.flatMap((order) => order.orderItems);
        await Order.deleteMany({user: userId});
        await OrderItem.deleteMany({_id: {$in: orderItemIds}})

        await CartProduct.deleteMany({_id: {$in: user.cart}});

        await User.findByIdAndUpdate(userId, { $set: { cart: [] } });

        await User.deleteOne({_id: userId})

        await Token.deleteOne({userId: userId});

        return res.status(204).end();

    } catch (err) {
        next(err);
    }
}

module.exports = {getUserCount,deleteUser};