const generateToken = require("../utils/generateToken");
const Token = require("../models/token");
const jwt = require("jsonwebtoken");

const tokenRefreshHandler = async (err, req, res, next) => {
  
  if (err.name == "UnauthorizedError") {
    if (!err.message.includes("jwt expired")) {
      
      res.code = err.status;
      throw new Error(err.message);
    }

    
    try {
      const tokenHeader = req.header("Authorization");
      const accessToken = tokenHeader?.split(" ")[1];
      let token = await Token.findOne({
        accessToken,
        refreshToken: { $exists: true },
      });
      if (!token) {
        return res
          .status(401)
          .json({ status: false, code: 401, msg: "Token does not exits." });
      }

      const user = jwt.verify(
        token.refreshToken,
        process.env.REFRESH_TOKEN_SECRET
      );

      if (!user) {
        res.code = 404;
        throw new Error('Invalid user!');
      }
      const newAccessToken = generateToken(
        user,
        "24h",
        process.env.ACCESS_TOKEN_SECRET
      );
      req.headers["authorization"] = `Bearer ${newAccessToken}`;
      await Token.updateOne(
        { _id: token._id },
        { accessToken: newAccessToken }
      ).exec();

      res.set("Authorization", `Bearer ${newAccessToken}`);
      req.user = token.userId;
      return next();
    } catch (refreshError) {
      next(refreshError)
    }
  }

  next(err);
  
};

module.exports = tokenRefreshHandler;
