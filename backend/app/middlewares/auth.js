const jwt = require("jsonwebtoken");
const json = require("../utils/jsonresponse");
const User = require("../models/user");

exports.isAuthenticated = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) return json(res, 403, `Forbidden request.`);

    const decode = jwt.verify(token, process.env.JWT_SECRET);
    const isUser = await User.findById(decode?.id).select("-password");
    if (!isUser) return json(res, 403, `Forbidden request.`);

    req.user = isUser;
    req.token = token;
    next();
  } catch (error) {
    json(res, 403, `Forbidden request.`);
  }
};

exports.isAuthorized = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      json(res, 401, `Unauthorized request.`);
      return next();
    }
    next();
  };
};
