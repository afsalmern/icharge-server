const db = require("../../models");

const User = db.users;

exports.getHome = async (req, res) => {
  try {
    const { user_id } = req;
    const { lat, long } = req.params;
    const getUser = await User.findByPk(user_id);
    if (!getUser) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({ user: getUser });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const { user } = req;
    return res.status(200).json({ user: user });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.updatUserProfile = async (req, res) => {
  const { user } = req;
  const { username, dob, avatar } = req.body;

  const transaction = await db.sequelize.transaction();
  try {
    await user.update({ username, dob, avatar }, { transaction });
    await transaction.commit();
    return res.status(200).json({
      message: "User profile updated successfully",
    });
  } catch (error) {
    console.log(error);
    await transaction.rollback();
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.getUserKycDetails = async (req, res) => {
  try {
    const { user } = req;
    return res.status(200).json({ user });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
