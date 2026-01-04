const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

async function authorizePostRequests(req, res, next) {
  try {
    if (req.method === "GET") return next();

    const API = process.env.API_URL;
    if (req.originalUrl.startsWith(`${API}/admin`)) return next();

    const endpoint = [
      `${API}/auth/login/`,
      `${API}/auth/register`,
      `${API}/auth/forgot-password`,
      `${API}/auth/verify-otp`,
      `${API}/auth/reset-password`
    ];

    const isMatchingEndpoint = endpoint.some((endpoint) =>
      req.originalUrl.includes(endpoint)
    );

    if (isMatchingEndpoint) return next();

    const authHeader = req.header("Authorization");

    if (!authHeader) return next();
    const accessToken = authHeader.replace("Bearer ", "").trim();

    const tokenData = jwt.decode(accessToken);

    if (req.body && req.body.user && tokenData._id !== req.body.user) {
      return res.status(401).json({
        message:
          "User conflict!The user making the request doesn't match the user in the request.Hack me if you dare.",
      });
    } else if (/\/users\/([^/]+)\//.test(req.originalUrl)) {
      const parts = req.originalUrl.split("/");
      const usersIndex = parts.indexOf("users");
      const id = parts[usersIndex + 1];
      if (!mongoose.isValidObjectId(id)) return next();
      if (tokenData._id !== id) {
        return res.status(401).json({
          message: "Unauthorized! You can only modify your own user data.",
        });
      }
    }

    return next();
  } catch (err) {
    next(err);
  }
}

module.exports = { authorizePostRequests };
