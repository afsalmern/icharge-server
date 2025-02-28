const { ApiError } = require("./error");

exports.checkRole = (role) => (req, res, next) => {
  const roles = ["admin", "user"];

  if (!roles.includes(role)) {
    throw new ApiError(403, "Invalid role");
  }

  if (req.role !== role) {
    throw new ApiError(403, "Access denied");
  }

  next();
};
