const jwt = require("jsonwebtoken");
const secret = process.env.JWT_SECRET;

exports.verifyToken = (req, res, next) => {
  let token = req.header("authorization");
  if (!token) {
    return res.status(401).send({
      authentication: false,
      message: "No token provided!",
    });
  }

  const bearer = token.split(" ");
  token = bearer[1];

  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      console.error(`error in verifying ${err.toString()}`);
      return res.status(401).send({
        authentication: false,
        message: err.toString(),
      });
    }

    if (!decoded) {
      return res.status(401).send({
        authentication: false,
        message: "Unauthorized!",
      });
    }

    req.user_id = decoded.user_id;
    next();
  });
};
