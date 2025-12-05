const db = require("../../models");
const { sendSuccess } = require("../../handlers/success_response_handler");
const { Op, Sequelize } = require("sequelize");
const { getEndTime, calculatePriceOnRentals, calculateTotalTimeUsed } = require("../../helpers/calculatePrices");
const { ApiError } = require("../../middlewares/error");

const User = db.users;
const Boxes = db.boxes;
const Locations = db.locations;
const Packages = db.packages;
const KycDetail = db.kyc_details;
const Checks = db.checks_and_amounts;
const ReferelCodes = db.referel_codes;

exports.getHome = async (req, res, next) => {
  const { user_id } = req;

  try {
    if (!user_id) {
      throw new ApiError(400, "User ID is required");
    }

    // Optimized: Defined shared query options
    const lockOptions = { lock: false };

    // Optimized: Extracted common Sequelize literals
    const timeFormatLiteral = (field, alias) => [db.Sequelize.literal(`TO_CHAR(${field}, 'HH12:MI AM')`), alias];

    const [devices, onGoingRental, userData, checks] = await Promise.all([
      // Optimized: Simplified device query
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
            timeFormatLiteral('"location"."starting_hour"', "start_time"),
            timeFormatLiteral('"location"."ending_hour"', "end_time"),
          ],
          where: { is_active: true },
        },
        where: {
          status: "active",
          available_powerbanks: { [Sequelize.Op.gt]: 0 },
        },
        ...lockOptions,
      }),

      // Optimized: Rental query with consolidated attributes
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
          {
            model: db.rental_payments,
            as: "rental_payments",
            attributes: ["status", "amount"],
          },
        ],
        ...lockOptions,
        raw: true,
        nest: true,
      }),

      // User query remains the same
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
        ...lockOptions,
        raw: true,
        nest: true,
      }),

      // Optimized: Single check query (assuming only one record exists)
      Checks.findOne({
        attributes: ["id", "is_kyc_enabled", "is_deposit_enabled", "deposit_amount"],
      }),
    ]);

    // Optimized: Early validation with specific error messages
    if (!userData) throw new ApiError(404, "User not found");
    if (userData.block_status) throw new ApiError(401, "User is blocked");
    if (userData.status !== "active") throw new ApiError(401, "User is inactive");

    // Optimized: Simplified destructuring
    const { deposit_amount = 0.0, is_kyc_enabled, is_deposit_enabled } = checks || {};
    const end_time = onGoingRental?.end_time;
    const isTimeElapsed = end_time && new Date(end_time) < new Date();

    // Optimized: Simplified notification logic
    const notificationsData = isTimeElapsed
      ? {
          title: "Overdue",
          sub_title: "You have an overdue rental, please return the box to continue using it",
          status: "ongoing",
        }
      : null;

    // Optimized: Extracted rental transformation logic
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
            rental_payments,
            disputes,
            return_time,
            type: device_type,
          } = onGoingRental;

          const { id: package_id, name, hourly_price, price, duration, type } = rented_package || {};
          const { name: userName, mobile } = rented_user || {};
          const { reason } = disputes || {};
          const { device_id } = rented_box || {};

          const payment = Array.isArray(rental_payments) && rental_payments.length > 0 ? rental_payments[0] : rental_payments;
          const amountPaid = payment?.amount || payment?.dataValues?.amount || 0;

          const packageDuration = duration;
          const cost_details = calculatePriceOnRentals(start_time, hourly_price, packageDuration, type);

          const time_used = calculateTotalTimeUsed(start_time, return_time, status);

          console.log("FROM HOME ====>", start_time, hourly_price, packageDuration, type);

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
            net_amount: amountPaid,
            disputes: reason,
            package: {
              package_id,
              name,
              type,
              duration,
            },
            ...cost_details,
            time_used,
          };
        })()
      : null;

    // Optimized: Cleaner response structure
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
  const { name, dob, email, referel_code } = req.body;
  const avatar = (req.files && req.files?.["avatar"]?.[0]?.filename) || null;
  const transaction = await db.sequelize.transaction();
  try {
    let code = false;
    if (referel_code) {
      const isCodeValid = await validateCode(referel_code);
      code = isCodeValid;
    }

    await user.update(
      { name, dob: dob ? dob : user.dob, email: email ? email : user.email, avatar: avatar ? avatar : user.avatar, referel_applied: code },
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
      where: { status: "completed" },
      attributes: ["id"],
      limit: 1,
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

    const onGoingRental = await db.rentals.findOne({
      attributes: ["id"],
      where: { user_id, status: "ongoing" },
    });

    if (onGoingRental) {
      throw new ApiError(400, "Cannot delete user with ongoing rentals");
    }

    const username = user.name;
    await user.destroy();
    sendSuccess(res, `User ${username} deleted successfully`, {}, 200);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const validateCode = async (code) => {
  try {
    const referelCode = await ReferelCodes.findOne({
      where: {
        code,
        type: "corporate",
        is_active: true,
      },
    });

    if (!referelCode) {
      throw new ApiError(400, "Invalid referral code");
    }

    return true;
  } catch (error) {
    console.error("Error finding referral code:", error);
    throw error;
  }
};
