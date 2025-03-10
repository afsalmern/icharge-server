const db = require("../../models");
const { sendSuccess } = require("../../handlers/success_response_handler");

const User = db.users;
const Boxes = db.boxes;
const Locations = db.locations;

exports.getHome = async (req, res, next) => {
  try {
    const devices = await Boxes.findAll({
      attributes: ["id", "location_id", "status", ["total_powerbanks","batteries"], ["available_powerbanks","slots"]],
      include: [
        {
          attributes: [
            "id",
            "name",
            "address",
            [db.Sequelize.literal(`TO_CHAR("location"."starting_hour", 'HH12:MI AM')`), "start_time"],
            [db.Sequelize.literal(`TO_CHAR("location"."ending_hour", 'HH12:MI AM')`), "end_time"],
          ],
          model: Locations,
          as: "location",
        },
      ],
    });
    sendSuccess(res, "Home details fetched successfully", { devices }, 200);
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
  const { name, dob, email } = req.body;

  const avatar = (req.files && req.files?.["avatar"]?.[0]?.filename) || null;
  const transaction = await db.sequelize.transaction();
  try {
    await user.update(
      { name, dob: dob ? dob : user.dob, email: email ? email : user.email, avatar: avatar ? avatar : user.avatar },
      { returning: true, transaction }
    );
    await transaction.commit();
    sendSuccess(res, "User profile updated successfully", { user }, 200);
  } catch (error) {
    console.log(error);
    await transaction.rollback();
    next(error);
  }
};

exports.getUserKycDetails = async (req, res, next) => {
  try {
    const { user } = req;
    return res.status(200).json({ user });
  } catch (error) {
    console.log(error);
    next(error);
  }
};
