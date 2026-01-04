const mongoose = require("mongoose");
const { User, CartProduct, Product, OrderItem, Order } = require("../models");

const addOrder = async (orderData) => {
  if (!mongoose.isValidObjectId(orderData.user)) {
    return console.error("User Validation Failed: Invalid user!");
  }
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = await User.findById(orderData.user);
    if (!user) {
      await session.abortTransaction();
      return console.trace("ORDER CREATION FAILED: User not found");
    }

    const orderItems = orderData.orderItems;
    const orderItemIds = [];
    for (const orderItem of orderItems) {
      if (
        !mongoose.isValidObjectId(orderItem.product) ||
        !(await Product.findById(orderItem.product))
      ) {
        await session.abortTransaction();
        return console.trace(
          "ORDER CREATION FAILED: Invalid product in the order"
        );
      }

      const product = await Product.findById(orderItem.product);
      const cartProduct = await CartProduct.findById(orderItem.cartProductId);
      if (!cartProduct) {
        await session.abortTransaction();
        return console.trace(
          "ORDER CREATION FAILED: Invalid cart product in order"
        );
      }

      let orderItemModel = await new OrderItem(orderItem).save({ session });
      if (!orderItemModel) {
        await session.abortTransaction();
        console.trace(
          "ORDER CREATION FAILED",
          `An order for product "${product.name}" could not be created`
        );
      }

      if (!cartProduct.reserved) {
        product.countInStock -= orderItemModel.quantity;
        await product.save({ session });
      }

      orderItemIds.push(orderItemModel._id);

      await CartProduct.findByIdAndDelete(orderItem.cartProductId).session(
        session
      );
      user.cart.pull(cartProduct._id);
      await user.save({ session });
    }

    orderData["orderItems"] = orderItemIds;

    let order = new Order(orderData);
    order.status = "processed";
    order.statusHistory.push("processed");

    order = await order.save({ session });

    if (!order) {
      await session.abortTransaction();
      return console.trace(
        "ORDER CREATION FAILED: Failed to save the main Order document"
      );
    }

    await session.commitTransaction();
    return order;
  } catch (err) {
    await session.abortTransaction();
    return console.trace(err);
  } finally {
    await session.endSession();
  }
};

const getUserOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.params.userId })
      .select("orderItems status totalPrice dateOrdered")
      .populate({ path: "orderItems", select: "productName productImage" })
      .sort({ dateOrdered: -1 });

    if (!orders) {
      res.code = 404;
      throw new Error('Product not found');
    }

    const completed = [];
    const active = [];
    const cancelled = [];

    for (const order of orders) {
      if (order.status == "delivered") {
        completed.push(order);
      } else if (["cancelled", "expired"].includes(order.status)) {
        cancelled.push(order);
      } else {
        active.push(order);
      }
    }

    return res.json({ total: orders.length, active, completed, cancelled });
  } catch (err) {
    next(err);
  }
};

const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate("orderItems");

    if(!order){
      res.code =404;
      throw new Error('Order not found');
    }

    return res.json(order);
  } catch (err) {
    next(err);
  }
};
module.exports = { addOrder,getUserOrders,getOrderById };
