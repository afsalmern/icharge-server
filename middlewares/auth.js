const jwt = require("jsonwebtoken");
const { ApiError } = require("./error");
const secret = process.env.JWT_SECRET;

exports.verifyToken = (req, res, next) => {
  try {
    let token = req.header("authorization");
    console.log("TOKEN", token);
    if (!token) {
      throw new ApiError(401, "No token provided!");
    }

    const bearer = token.split(" ");
    token = bearer[1];
    console.log("TOKEN BEARER", token);

    jwt.verify(token, secret, (err, decoded) => {
      if (err) {
        console.error(`error in verifying ${err.toString()}`);
        throw new ApiError(401, err.toString());
      }

      if (!decoded) {
        throw new ApiError(401, "Unauthorized!");
      }

      req.user_id = decoded.user_id;
      req.role = decoded.role;
      next();
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
};
