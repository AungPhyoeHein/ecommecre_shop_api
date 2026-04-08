const jwt = require("jsonwebtoken");
const generateToken = (user, expiresIn, secret) => {
  const token = jwt.sign(
    {
      _id: user._id,
      isAdmin: user.isAdmin,
      role: user.role,
    },
    secret,
    { expiresIn: expiresIn },
  );

  return token;
};

module.exports = generateToken;
