const db = require("../../models");
const { sendSuccess } = require("../../handlers/success_response_handler");
const { Op, Sequelize } = require("sequelize");
const { getEndTime, calculatePriceOnRentals } = require("../../helpers/calculatePrices");
const { ApiError } = require("../../middlewares/error");

const User = db.users;
const Boxes = db.boxes;
const Locations = db.locations;
const Packages = db.packages;
const KycDetail = db.kyc_details;
const Checks = db.checks_and_amounts;

exports.getHome = async (req, res, next) => {
  const { user_id } = req;

  try {
    if (!user_id) {
      throw new ApiError(400, "User ID is required");
    }
    const [devices, onGoingRental, userData, checks] = await Promise.all([
      Boxes.findAll({
        attributes: ["id", "location_id", "status", ["total_powerbanks", "batteries"], ["available_powerbanks", "slots"], "unique_id"],
        include: {
          model: Locations,
          as: "location",
          attributes: [
            "id",
            "name",
            "address",
            "latitude",
            "longitude",
            [db.Sequelize.literal(`TO_CHAR("location"."starting_hour", 'HH12:MI AM')`), "start_time"],
            [db.Sequelize.literal(`TO_CHAR("location"."ending_hour", 'HH12:MI AM')`), "end_time"],
          ],
        },
        where: { status: "active", available_powerbanks: { [Sequelize.Op.gt]: 0 } },
        lock: false,
      }),
      db.rentals.findOne({
        attributes: [
          ["id", "order_id"],
          "box_id",
          "start_time",
          "end_time",
          "status",
          "rental_hours",
          "type",
          [db.Sequelize.literal(`TO_CHAR("start_time", 'DD Mon YYYY, HH12:MI AM')`), "start_on"],
        ],
        where: { status: "ongoing", user_id },
        include: [
          {
            model: Packages,
            as: "rented_package",
            attributes: ["id", "name", "hourly_price", "price", "duration", "swap", "type"],
          },
          {
            model: Boxes,
            as: "rented_box",
            attributes: ["id", "status", "device_id"],
          },
          {
            model: User,
            as: "rented_user",
            attributes: ["id", "name", "mobile"],
          },
          {
            model: db.disputes,
            as: "disputes",
            attributes: ["id", "reason"],
          },
        ],
        lock: false,
        raw: true,
        nest: true,
      }),
      User.findByPk(user_id, {
        attributes: [
          "id",
          "name",
          "email",
          "mobile",
          "avatar",
          "deposit_amount",
          "outstanding_amount",
          "block_status",
          "status",
          "is_verified",
          "referel_applied",
          "user_preferred_method",
        ],
        include: {
          model: KycDetail,
          as: "kyc_details",
          attributes: ["id", "status", "reject_remarks"],
        },
        lock: false,
        raw: true,
        nest: true,
      }),
      Checks.findAll({
        attributes: ["id", "is_kyc_enabled", "is_deposit_enabled", "deposit_amount"],
      }),
    ]);

    if (!userData) throw new ApiError(404, "User not found");
    if (userData.block_status) throw new ApiError(403, "User is blocked");
    if (userData.status !== "active") throw new ApiError(403, "User is inactive");
    // if (!userData.is_verified) throw new ApiError("User not verified", 403);

    const { deposit_amount = 0.0, is_kyc_enabled, is_deposit_enabled } = checks[0] || {};
    const end_time = onGoingRental?.end_time || null;
    const isTimeElapsed = end_time ? new Date(end_time).getTime() < new Date().getTime() : false;

    const notificationsData = isTimeElapsed
      ? {
          title: "Overdue",
          sub_title: "You have an overdue rental, please return the box to continue using it",
          status: "ongoing",
        }
      : null;

    const rentalsModified = onGoingRental
      ? (() => {
          const {
            order_id,
            start_time,
            start_on,
            status,
            end_time,
            rented_package,
            rented_user,
            rented_box,
            disputes,
            rental_hours,
            type: device_type,
          } = onGoingRental;
          const { id: package_id, name, hourly_price, price, duration, type } = rented_package || {};
          const { name: userName, mobile } = rented_user || {};
          const { reason } = disputes || {};
          const { device_id } = rented_box || {};

          const packageDuration = type == "hourly" ? rental_hours : duration;

          const cost_details = calculatePriceOnRentals(start_time, hourly_price, packageDuration, type);

          return {
            device_type,
            order_id,
            start_time,
            start_on,
            status,
            device_id,
            end_time,
            name: userName,
            mobile,
            net_amount: price,
            disputes: reason,
            package: {
              package_id,
              name,
              type,
              duration,
            },
            ...cost_details,
          };
        })()
      : null;

    sendSuccess(
      res,
      "Home details fetched successfully",
      {
        devices,
        onGoingRental: rentalsModified,
        notifications: notificationsData,
        steps: [],
        userStatus: userData,
        verification_methods: {
          kyc_enable: is_kyc_enabled,
          deposit_enable: is_deposit_enabled,
          deposit_amount: Number(deposit_amount),
        },
      },
      200
    );
  } catch (error) {
    console.error("Error in getHome:", error);
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

exports.getPackages = async (req, res, next) => {
  try {
    const { user_id } = req;

    const user = await User.findByPk(user_id);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const rentals = await user.getRentals({
      attributes: ["id", "status"],
      where: {
        status: "completed",
      },
    });

    const queryOptions = {
      attributes: ["id", "name", "duration", "price", "description", "image", "swap", "type", "hourly_price"],
      order: [["created_at", "DESC"]],
    };

    if (rentals.length > 0) {
      queryOptions.where = {
        type: { [Op.notIn]: ["free"] }, // exclude free packages
      };
    }

    const packages = await Packages.findAll(queryOptions);
    const outstandingAmount = parseFloat(user.outstanding_amount) || 0;

    sendSuccess(res, "Packages fetched successfully", { packages, outstandingAmount }, 200);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const { user_id } = req;

    const user = await User.findByPk(user_id, {
      attributes: ["id", "name"],
    });
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    const username = user.name;
    await user.destroy();
    sendSuccess(res, `User ${username} deleted successfully`, {}, 200);
  } catch (error) {
    console.log(error);
    next(error);
  }
};
