const db = require("../../models");
const { sendSuccess } = require("../../handlers/success_response_handler");

const User = db.users;

exports.getHome = async (req, res, next) => {
  try {
    const { user } = req;
    const { lat, long } = req.params;

    sendSuccess(res, "Home details fetched successfully", { user }, 200);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.getUserProfile = async (req, res, next) => {
  try {
    const { user } = req;
    sendSuccess(res, "User profile fetched successfully", { user }, 200);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.updatUserProfile = async (req, res, next) => {
  const { user } = req;
  const { username, dob, avatar } = req.body;

  const transaction = await db.sequelize.transaction();
  try {
    await user.update({ username, dob, avatar }, { returning: true, transaction });
    await transaction.commit();
    sendSuccess(res, "User profile updated successfully", { user }, 200);
  } catch (error) {
    console.log(error);
    await transaction.rollback();
    next(error);
  }
};

exports.getUserKycDetails = async (req, res,next) => {
  try {
    const { user } = req;
    return res.status(200).json({ user });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.getRentalDetails = async (req, res,next) => {
  try {
    const { user } = req;
    return res.status(200).json({ user });
  } catch (error) {
    console.log(error);
    next(error);
  }
};
