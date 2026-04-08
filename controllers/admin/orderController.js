const { Order, OrderItem, User } = require("../../models");

const getOrders = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 10, status = "", search = "" } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    if (search) {
      // Find users matching the search query to filter orders by user name/email
      const users = await User.find({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }).select("_id");
      const userIds = users.map((u) => u._id);

      query.$or = [
        { phone: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
        { shippingAddress: { $regex: search, $options: "i" } },
        { user: { $in: userIds } },
      ];
    }

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate("user", "name email")
      .populate({
        path: "orderItems",
        populate: {
          path: "product",
          select: "name price image",
        },
      })
      .sort({ dateOrdered: -1 })
      .skip((parseInt(page) - 1) * parseInt(pageSize))
      .limit(parseInt(pageSize));

    res.json({
      data: orders,
      pagination: {
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / parseInt(pageSize)),
      },
    });
  } catch (err) {
    next(err);
  }
};
const getOrdersCount = async (req, res, next) => {
  try {
    const count = await Order.countDocuments();
    if (!count && count != 0) {
      throw new Error("Could not count orders!");
    }

    return res.json({ count });
  } catch (err) {
    next(err);
  }
};
const changeOrderStatus = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const newStatus = req.body.status || null;

    if (newStatus === null) {
      return res.status(400).json({ message: "Status Required." });
    }

    let order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    if (order.status !== newStatus) {
      order.statusHistory.push(order.status);
      order.status = newStatus;
    }

    order = await order.save();
    return res.json({
      message: "Order status updated successfully.",
      data: order,
    });
  } catch (err) {
    next(err);
  }
};

const deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) {
      res.code = 404;
      throw new Error("Order not found");
    }
    for (const orderItemId of order.orderItems) {
      await OrderItem.findByIdAndDelete(orderItemId);
    }
    return res.status(204).end();
  } catch (err) {
    next(err);
  }
};

const getMonthlySales = async (req, res, next) => {
  try {
    const { year } = req.query;
    const currentYear = year || new Date().getFullYear();

    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

    const sales = await Order.aggregate([
      {
        $match: {
          dateOrdered: { $gte: startOfYear, $lte: endOfYear },
          status: { $ne: "cancled" }, // Exclude cancelled orders
        },
      },
      {
        $group: {
          _id: { $month: "$dateOrdered" },
          totalSales: { $sum: "$totalPrice" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Format for easier frontend consumption (ensure all 12 months are present)
    const formattedSales = Array.from({ length: 12 }, (_, i) => {
      const monthData = sales.find((s) => s._id === i + 1);
      return {
        month: i + 1,
        totalSales: monthData ? monthData.totalSales : 0,
        count: monthData ? monthData.count : 0,
      };
    });

    res.json(formattedSales);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getOrders,
  getOrdersCount,
  changeOrderStatus,
  deleteOrder,
  getMonthlySales,
};
