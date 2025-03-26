const db = require("../../models");
const { sendSuccess } = require("../../handlers/success_response_handler");

const User = db.users;
const Boxes = db.boxes;
const Locations = db.locations;
const Packages = db.packages;
const KycDetail = db.kyc_details;

// exports.getHome = async (req, res, next) => {
//   const { user_id } = req;

//   try {
//     const devices = await Boxes.findAll({
//       attributes: ["id", "location_id", "status", ["total_powerbanks", "batteries"], ["available_powerbanks", "slots"]],
//       include: [
//         {
//           attributes: [
//             "id",
//             "name",
//             "address",
//             "latitude",
//             "longitude",
//             [db.Sequelize.literal(`TO_CHAR("location"."starting_hour", 'HH12:MI AM')`), "start_time"],
//             [db.Sequelize.literal(`TO_CHAR("location"."ending_hour", 'HH12:MI AM')`), "end_time"],
//           ],
//           model: Locations,
//           as: "location",
//         },
//       ],
//     });

//     const onGoingRentals = await db.rentals.findOne({
//       attributes: [["id", "order_id"], "box_id", "start_time", "status"],
//       where: { status: "ongoing", user_id: user_id },
//       include: [
//         {
//           model: Packages,
//           as: "rented_package",
//           attributes: ["duration", "price"],
//         },
//       ],
//     });

//     let notificationsData;
//     if (onGoingRentals) {
//       notificationsData = {
//         title: "Overdue",
//         sub_title: "You have an overdue rental, please return the box to continue using it",
//         status: "ongoing",
//       };
//     }

//     const stepsData = [
//       {
//         title: "Step 1",
//         description: "Find and select nearest power bank station a box",
//         image: "https://dummyimage.com/100x100/000/fff&text=Step+1",
//       },
//       {
//         title: "Step 2",
//         description: "Select a Scan QR code to unlock power bank",
//         image: "https://dummyimage.com/100x100/000/fff&text=Step+2",
//       },
//     ];

//     const userData = await User.findByPk(user_id, {
//       attributes: [
//         "id",
//         "name",
//         "email",
//         "mobile",
//         "avatar",
//         "deposit_amount",
//         "outstanding_amount",
//         "block_status",
//         "status",
//         "is_verified",
//       ],
//       include: [
//         {
//           model: KycDetail,
//           as: "kyc_details",
//           attributes: ["id", "status", "reject_remarks"],
//         },
//       ],
//     });

//     // const userStatus = {
//     //   kyc_status: "pending",
//     //   user_name: "Guest User",
//     //   avatar: "https://dummyimage.com/100x100/000/fff&text=Step+1",
//     // };

//     const rentalsModified =
//       onGoingRentals === null
//         ? null
//         : {
//             ...onGoingRentals.toJSON(),
//             current_cost: 100,
//             total_hours: 100,
//             duration: 2,
//           };

//     sendSuccess(
//       res,
//       "Home details fetched successfully",
//       { devices, onGoingRental: rentalsModified, notifications: notificationsData, steps: stepsData, userStatus: userData },
//       200
//     );
//   } catch (error) {
//     console.log(error);
//     next(error);
//   }
// };


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

  // Cost based on total hours (or adjust to overdue hours if that's your logic)
  const current_cost = hourly_price ? (totalHours * hourly_price).toFixed(2) : 0;

  return {
    elapsed_hours: elapsedHours.toFixed(2),  // Hours past expected end (overdue)
    total_hours: totalHours.toFixed(2),      // Total used hours from start to now
    current_cost: parseFloat(current_cost),  // Cost based on total hours
  };
};

exports.getHome = async (req, res, next) => {
  const { user_id } = req;

  if (!user_id) {
    return next(new ApiError(400, "User ID is required"));
  }

  try {
    const [devices, onGoingRental, userData] = await Promise.all([
      Boxes.findAll({
        attributes: [
          "id",
          "location_id",
          "status",
          ["total_powerbanks", "batteries"],
          ["available_powerbanks", "slots"],
        ],
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
        lock: false,
      }),
      db.rentals.findOne({
        attributes: [
          ["id", "order_id"],
          "box_id",
          "start_time",
          "status",
          [db.Sequelize.literal(`TO_CHAR("start_time", 'DD Mon YYYY, HH12:MI AM')`), "start_on"],
        ],
        where: { status: "ongoing", user_id },
        include: [
          {
            model: Packages,
            as: "rented_package",
            attributes: ["id", "hourly_price", "price", "duration"], // Added duration
          },
          {
            model: User,
            as: "rented_user",
            attributes: ["id", "name", "mobile"],
          },
        ],
        lock: false,
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
        ],
        include: {
          model: KycDetail,
          as: "kyc_details",
          attributes: ["id", "status", "reject_remarks"],
        },
        lock: false,
      }),
    ]);

    const notificationsData = onGoingRental
      ? {
          title: "Overdue",
          sub_title: "You have an overdue rental, please return the box to continue using it",
          status: "ongoing",
        }
      : null;

    const rentalsModified = onGoingRental
      ? (() => {
          const { id: order_id, start_time, status, rented_package, rented_user } = onGoingRental;
          const { hourly_price, price, duration } = rented_package || {};
          const { name, mobile } = rented_user || {};
          const start_on = onGoingRental.get("start_on");

          const cost_details = calculatePriceOnRentals(start_time, hourly_price, duration || 0);

          return {
            order_id,
            start_time,
            start_on,
            status,
            name,
            mobile,
            net_amount: price,
            ...cost_details, // Includes elapsed_hours, total_hours, total_used_hours, current_cost
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
        steps: stepsData,
        userStatus: userData,
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
    const packages = await Packages.findAll({
      attributes: ["id", "name", "duration", "price", "description", "image", "swap", "type"],
    });
    sendSuccess(res, "Packages fetched successfully", { packages }, 200);
  } catch (error) {
    console.log(error);
    next(error);
  }
};
