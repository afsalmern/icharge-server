const db = require("../../models");
const { sendSuccess } = require("../../handlers/success_response_handler");
const { calculatePriceOnRentals } = require("../../helpers/calculatePrices");
const { ApiError } = require("../../middlewares/error");

const User = db.users;
const Boxes = db.boxes;
const Locations = db.locations;
const Packages = db.packages;
const KycDetail = db.kyc_details;

exports.getHome = async (req, res, next) => {
  try {
    const devices = await Boxes.findAll({
      attributes: ["id", "location_id", "status", ["total_powerbanks", "batteries"], ["available_powerbanks", "slots"]],
      include: [
        {
          attributes: [
            "id",
            "name",
            "address",
            "latitude",
            "longitude",
            [db.Sequelize.literal(`TO_CHAR("location"."starting_hour", 'HH12:MI AM')`), "start_time"],
            [db.Sequelize.literal(`TO_CHAR("location"."ending_hour", 'HH12:MI AM')`), "end_time"],
          ],
          model: Locations,
          as: "location",
        },
      ],
    });

    const onGoingRentals = await db.rentals.findOne({
      attributes: [["id", "order_id"], "box_id", "start_time", "status"],
      where: { status: "ongoing" },
      include: [
        {
          model: Packages,
          as: "rented_package",
          attributes: ["duration", "price"],
        },
      ],
    });

    const notificationsData = {
      title: "Overdue",
      sub_title: "You have an overdue rental, please return the box to continue using it",
      status: "ongoing",
    };

    const stepsData = [
      {
        title: "Step 1",
        description: "Find and select nearest power bank station a box",
        image: "https://dummyimage.com/100x100/000/fff&text=Step+1",
      },
      {
        title: "Step 2",
        description: "Select a Scan QR code to unlock power bank",
        image: "https://dummyimage.com/100x100/000/fff&text=Step+2",
      },
    ];

    const userStatus = {
      kyc_status: "pending",
      user_name: "Guest User",
      avatar: "https://dummyimage.com/100x100/000/fff&text=Step+1",
    };

    const rentalsModified =
      onGoingRentals === null
        ? null
        : {
            ...onGoingRentals.toJSON(),
            current_cost: 100,
            total_hours: 100,
            duration: 2,
          };

    sendSuccess(
      res,
      "Home details fetched successfully",
      { devices, onGoingRental: rentalsModified, notifications: notificationsData, steps: stepsData, userStatus },
      200
    );
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

exports.uploadKyc = async (req, res, next) => {
  const { user_id } = req;
  const { full_name, proof_type, proof_number } = req.body;

  const proof_front = (req.files && req.files?.["proof_front"]?.[0]?.filename) || null;
  const proof_back = (req.files && req.files?.["proof_back"]?.[0]?.filename) || null;
  const photo = (req.files && req.files?.["kyc_photo"]?.[0]?.filename) || null;

  try {
    const user = await User.findByPk(user_id);

    const kyc = await user?.createKyc_details({
      full_name,
      proof_type,
      proof_number,
      proof_front,
      proof_back,
      photo,
      submitted_at: new Date(),
      verified_at: null,
    });

    sendSuccess(res, "Kyc details updated successfully", { kyc }, 200);
  } catch (error) {
    console.log(error);
    next(error);
  }
};
