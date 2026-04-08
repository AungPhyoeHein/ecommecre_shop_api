const { User } = require("../../models");

const getAdmins = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 10, search = "" } = req.query;
    const query = { isAdmin: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const total = await User.countDocuments(query);
    const admins = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(pageSize))
      .limit(parseInt(pageSize));

    res.json({
      data: admins,
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

const toggleAdminStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      res.code = 404;
      throw new Error("User not found");
    }

    user.isAdmin = !user.isAdmin;
    // If becoming admin, set role to admin as well
    if (user.isAdmin) {
      user.role = "admin";
    } else {
      user.role = "user";
    }

    await user.save();

    res.json({
      message: `Admin status ${user.isAdmin ? "granted" : "revoked"} successfully`,
      data: { isAdmin: user.isAdmin, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!["user", "admin"].includes(role)) {
      res.code = 400;
      throw new Error("Invalid role");
    }

    const user = await User.findById(id);
    if (!user) {
      res.code = 404;
      throw new Error("User not found");
    }

    user.role = role;
    user.isAdmin = role === "admin";
    await user.save();

    res.json({
      message: "User role updated successfully",
      data: { role: user.role, isAdmin: user.isAdmin },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAdmins,
  toggleAdminStatus,
  updateUserRole,
};
