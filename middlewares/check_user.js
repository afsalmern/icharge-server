const db = require("../models");
const { ApiError } = require("./error");
const Users = db.users;

const verifyUserExist = async (req, res, next) => {
  try {
    const { user_id } = req; // Assuming user_id is attached to req from auth middleware

    if (!user_id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const getUser = await Users.findByPk(user_id);
    if (!getUser) {
      return res.status(404).json({ error: "User not found" });
    }

    req.user = getUser; // Attach user object to req for use in controllers
    next(); // Proceed to the next middleware or controller
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const checkIsKycSubmitted = async (req, res, next) => {
  try {
    const { user_id } = req;

    const user = await Users.findByPk(user_id);
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    const isKycSubmitted = await user?.getKyc_details();

    if (isKycSubmitted) {
      throw new ApiError(400, "Kyc details already submitted");
    }
    next();
  } catch (error) {
    console.error(error);
    next(error);
  }
};

module.exports = { verifyUserExist, checkIsKycSubmitted };
