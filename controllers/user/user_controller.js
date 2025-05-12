const db = require("../../models");
const { sendSuccess } = require("../../handlers/success_response_handler");
const { Op, Sequelize } = require("sequelize");
const { getEndTime } = require("../../helpers/calculatePrices");
const { ApiError } = require("../../middlewares/error");

const User = db.users;
const Boxes = db.boxes;
const Locations = db.locations;
const Packages = db.packages;
const KycDetail = db.kyc_details;
const disputes = db.disputes;
const Checks = db.checks_and_amounts;

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

const calculatePriceOnRentals = (start_time, hourly_price, package_duration) => {
  const now = new Date();
  const start = new Date(start_time);
  const elapsedMs = now - start; // Total time since start in milliseconds
  const totalHours = Math.max(elapsedMs / (1000 * 60 * 60), 0); // Total used hours

  // Calculate expected end time based on package duration
  const expectedEndMs = start.getTime() + package_duration * 60 * 60 * 1000; // duration in hours -> ms
  const overdueMs = now - expectedEndMs; // Time past expected end
  const elapsedHours = Math.max(overdueMs / (1000 * 60 * 60), 0); // Overdue hours, 0 if not overdue

  // Cost based on total hours
  const current_cost = hourly_price ? (totalHours * hourly_price).toFixed(2) : 0;

  return {
    elapsed_hours: elapsedHours.toFixed(2), // Hours past expected end (overdue)
    total_hours: totalHours.toFixed(2), // Total used hours from start to now
    current_cost: parseFloat(current_cost), // Cost based on total hours
  };
};

// exports.getHome = async (req, res, next) => {
//   const { user_id } = req;

//   if (!user_id) {
//     return next(new ApiError(400, "User ID is required"));
//   }

//   try {
//     const [devices, onGoingRental, userData, checks] = await Promise.all([
//       Boxes.findAll({
//         attributes: ["id", "location_id", "status", ["total_powerbanks", "batteries"], ["available_powerbanks", "slots"]],
//         include: {
//           model: Locations,
//           as: "location",
//           attributes: [
//             "id",
//             "name",
//             "address",
//             "latitude",
//             "longitude",
//             [db.Sequelize.literal(`TO_CHAR("location"."starting_hour", 'HH12:MI AM')`), "start_time"],
//             [db.Sequelize.literal(`TO_CHAR("location"."ending_hour", 'HH12:MI AM')`), "end_time"],
//           ],
//         },
//         lock: false,
//       }),
//       db.rentals.findOne({
//         attributes: [
//           ["id", "order_id"], // Alias id as order_id
//           "box_id",
//           "start_time",
//           "end_time",
//           "status",
//           [db.Sequelize.literal(`TO_CHAR("start_time", 'DD Mon YYYY, HH12:MI AM')`), "start_on"],
//         ],
//         where: { status: "ongoing", user_id },
//         include: [
//           {
//             model: Packages,
//             as: "rented_package",
//             attributes: ["id", "hourly_price", "price", "duration"],
//           },
//           {
//             model: User,
//             as: "rented_user",
//             attributes: ["id", "name", "mobile"],
//           },
//           {
//             model: disputes,
//             as: "disputes",
//             attributes: ["id", "reason"],
//           },
//         ],
//         lock: false,
//         raw: true, // Return plain object for main query
//         nest: true, // Keep nested structure for includes
//       }),
//       User.findByPk(user_id, {
//         attributes: ["id", "name", "email", "mobile", "avatar", "deposit_amount", "outstanding_amount", "block_status", "status", "is_verified","user_preferred_method"],
//         include: {
//           model: KycDetail,
//           as: "kyc_details",
//           attributes: ["id", "status", "reject_remarks"],
//         },
//         lock: false,
//         raw: true,
//         nest: true,
//       }),
//       Checks.findAll({
//         attributes: ["id", "is_kyc_enabled", "is_deposit_enabled", "deposit_amount"],
//       }),
//     ]);

//     const { deposit_amount = 0.0, is_kyc_enabled, is_deposit_enabled } = checks[0];
//     const end_time = onGoingRental?.end_time || null;

//     const isTimeElapsed = end_time ? new Date(end_time).getTime() < new Date().getTime() : false;

//     const notificationsData = isTimeElapsed
//       ? {
//           title: "Overdue",
//           sub_title: "You have an overdue rental, please return the box to continue using it",
//           status: "ongoing",
//         }
//       : null;

//     const rentalsModified = onGoingRental
//       ? (() => {
//           const { order_id, start_time, status, rented_package, rented_user, start_on, disputes, end_time } = onGoingRental;
//           const { hourly_price, price, duration } = rented_package || {};
//           const { name, mobile } = rented_user || {};
//           const { reason } = disputes || {};

//           const cost_details = calculatePriceOnRentals(start_time, hourly_price, duration || 0);

//           return {
//             order_id,
//             start_time,
//             start_on,
//             status,
//             name,
//             mobile,
//             net_amount: price,
//             disputes: reason,
//             ...cost_details, // Includes elapsed_hours, total_hours, current_cost
//           };
//         })()
//       : null;

//     sendSuccess(
//       res,
//       "Home details fetched successfully",
//       {
//         devices,
//         onGoingRental: rentalsModified,
//         notifications: notificationsData,
//         steps: stepsData,
//         userStatus: userData,
//         verification_methods: {
//           kyc_enable: is_kyc_enabled,
//           deposit_enable: is_deposit_enabled,
//           deposit_amount: Number(deposit_amount)
//         },
//       },
//       200
//     );
//   } catch (error) {
//     console.error("Error in getHome:", error);
//     next(error);
//   }
// };

exports.getHome = async (req, res, next) => {
  const { user_id } = req;

  if (!user_id) {
    return next(new ApiError("User ID is required", 400));
  }

  try {
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
          "power_number",
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
          "user_preferred_method",
          "swaps_used",
          "swaps_remaining",
          "can_swap",
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

    if (!userData) throw new ApiError("User not found", 404);
    if (!userData.is_verified) throw new ApiError("User not verified", 400);
    if (userData.block_status) throw new ApiError("User is blocked", 403);
    if (userData.status !== "active") throw new ApiError("User is inactive", 403);

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
          const { order_id, start_time, start_on, status, power_number, end_time, rented_package, rented_user, disputes } = onGoingRental;
          const { id: package_id, name, hourly_price, price, duration, swap, type } = rented_package || {};
          const { name: userName, mobile } = rented_user || {};
          const { reason } = disputes || {};

          // Use user table fields, validate can_swap
          const swapsUsed = userData.swaps_used;
          const swapsRemaining = userData.swaps_remaining === null ? "unlimited" : userData.swaps_remaining;
          const canSwap = userData.can_swap && !isTimeElapsed && userData.is_verified && !userData.block_status && userData.status === "active";

          const cost_details = calculatePriceOnRentals(start_time, hourly_price, duration || 0);

          return {
            order_id,
            start_time,
            start_on,
            status,
            power_number,
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
              swap_limit: type === "monthly" ? "unlimited" : swap,
            },
            swaps_used: swapsUsed,
            swaps_remaining: swapsRemaining,
            can_swap: canSwap,
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
        steps: [], // Define or remove
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
        status: "ongoing",
      },
    });

    let packages = null;

    if (rentals.length > 0) {
      packages = await Packages.findAll({
        attributes: ["id", "name", "duration", "price", "description", "image", "swap", "type"],
        where: {
          type: {
            [Op.notIn]: ["free"],
          },
        },
        order: [["created_at", "DESC"]],
      });
      return sendSuccess(res, "Packages fetched successfully", { packages }, 200);
    }

    packages = await Packages.findAll({
      attributes: ["id", "name", "duration", "price", "description", "image", "swap", "type"],
    });
    sendSuccess(res, "Packages fetched successfully", { packages }, 200);
  } catch (error) {
    console.log(error);
    next(error);
  }
};
