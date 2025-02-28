const jwt = require("jsonwebtoken");
const secret = process.env.JWT_SECRET;
exports.generateToken = (user) => {
  const { id, role } = user;

  const token = jwt.sign({ user_id: id, role }, process.env.JWT_SECRET, { expiresIn: "1d" });
  return token;
};
