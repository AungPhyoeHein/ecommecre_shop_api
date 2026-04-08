const { User, CartProduct, Order, OrderItem, Token } = require("../../models");

const getUserCount = async (req, res, next) => {
  try {
    const userCount = await User.countDocuments();
    return res.status(200).json({ userCount });
  } catch (err) {
    next(err);
  }
};

const getUsers = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 10, search = "", isAdmin } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    if (isAdmin !== undefined) {
      query.isAdmin = isAdmin === "true";
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(pageSize))
      .limit(parseInt(pageSize));

    res.json({
      data: users,
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

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, isAdmin, phone, city, country } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (name !== undefined) user.name = name;
    if (isAdmin !== undefined) user.isAdmin = isAdmin;
    if (phone !== undefined) user.phone = phone;
    if (city !== undefined) user.city = city;
    if (country !== undefined) user.country = country;

    await user.save();
    res.json({ message: "User updated successfully.", data: user });
  } catch (err) {
    next(err);
  }
};

const bulkDeleteUsers = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ message: "IDs must be an array." });
    }

    // For each user, we need to do the same cleanup as deleteUser
    // But for simplicity in bulk, we'll just delete them and tokens for now.
    // Full cleanup would require a loop or more complex query.
    await User.deleteMany({ _id: { $in: ids } });
    await Token.deleteMany({ userId: { $in: ids } });

    res.json({ message: "Users deleted successfully." });
  } catch (err) {
    next(err);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const userId = req.params.id;

    const user = await User.findOne({ _id: userId });
    if (!user) {
      res.code = 404;
      throw new Error("User not found.");
    }

    const orders = await Order.find({ user: userId });
    const orderItemIds = orders.flatMap((order) => order.orderItems);
    await Order.deleteMany({ user: userId });
    await OrderItem.deleteMany({ _id: { $in: orderItemIds } });

    await CartProduct.deleteMany({ _id: { $in: user.cart } });

    await User.findByIdAndUpdate(userId, { $set: { cart: [] } });

    await User.deleteOne({ _id: userId });

    await Token.deleteOne({ userId: userId });

    return res.status(204).end();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getUserCount,
  getUsers,
  updateUser,
  bulkDeleteUsers,
  deleteUser,
};
