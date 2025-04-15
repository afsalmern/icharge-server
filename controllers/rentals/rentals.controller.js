const { sendSuccess } = require("../../handlers/success_response_handler");
const { getCostOnHours, getCostOnWeeks, calculatePriceOnRentals, calculateTotalPrice, getEndTime } = require("../../helpers/calculatePrices");
const { startRent, getDeviceInfoByUuid } = require("../../helpers/externalCalls");
const { ApiError } = require("../../middlewares/error");
const db = require("../../models");

const Boxes = db.boxes;
const Users = db.users;
const Packages = db.packages;
const Locations = db.locations;
const Rentals = db.rentals;
const Disputes = db.disputes;
const Powerbanks = db.powerbanks;

exports.checkIsDeviceValid = async (req, res, next) => {
  try {
    const { device_id } = req.query;

    // Validate request input
    if (!device_id) {
      return sendSuccess(res, "Device ID is required", { is_scan_valid: false }, 400);
    }

    // Fetch the box by device_id
    const box = await Boxes.findOne({
      where: { device_id },
    });

    // If no box is found, return "Device is not valid"
    if (!box) {
      return sendSuccess(res, "Device is not valid", { is_scan_valid: false }, 200);
    }

    // Check if available_powerbanks is 0 or less
    if (box.available_powerbanks <= 0) {
      return sendSuccess(res, "No powerbanks available in this device", { is_scan_valid: false }, 200);
    }

    // External operation
    const deviceResponse = await getDeviceInfoByUuid(box?.unique_id);

    if (!deviceResponse.success) {
      return sendSuccess(res, deviceResponse.message, { is_scan_valid: false }, deviceResponse.code);
    }

    // If box exists and has available powerbanks, return success
    sendSuccess(res, "Device is valid", { is_scan_valid: true }, 200);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.getRentalHistory = async (req, res, next) => {
  try {
    const { user_id } = req;
    const userRentals = await Rentals.findAll({
      where: { user_id },
      attributes: [
        ["id", "order_id"],
        "box_id",
        "package_id",
        [db.Sequelize.literal(`TO_CHAR("start_time", 'DD Mon YYYY, HH12:MI AM')`), "start_on"],
        "start_time",
        "end_time",
        "status",
      ],
      include: [
        {
          model: Boxes,
          as: "rented_box",
          attributes: ["id", "status", "unique_id"],
        },
        {
          model: Packages,
          as: "rented_package",
          attributes: ["id", "hourly_price", "price"],
        },
        {
          model: Disputes,
          as: "disputes",
          attributes: ["id", "reason"],
        },
      ],
      raw: true,
      nest: true,
    });

    const rentals_history = userRentals?.map((rental) => {
      const { order_id, start_time, start_on, status, rented_package, disputes } = rental;
      const { hourly_price, price } = rented_package || {};
      const { reason } = disputes || {};

      const cost_details = calculatePriceOnRentals(start_time, hourly_price);

      return {
        order_id,
        start_time: start_on,
        status,
        net_amount: price,
        dispute: reason,
        ...cost_details,
      };
    });

    sendSuccess(res, "Rental details fetched successfully", { rentals_history }, 200);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.getAllRentals = async (req, res, next) => {
  try {
    const userRentals = await Rentals.findAll({
      attributes: [
        ["id", "order_id"],
        "box_id",
        "package_id",
        [db.Sequelize.literal(`TO_CHAR("start_time", 'DD Mon YYYY, HH12:MI AM')`), "start_on"],
        "start_time",
        "end_time",
        "status",
      ],
      include: [
        {
          model: Users,
          as: "rented_user",
          attributes: ["id", "name", "mobile"],
        },
        {
          model: Boxes,
          as: "rented_box",
          attributes: ["id", "status", "unique_id"],
        },
        {
          model: Packages,
          as: "rented_package",
          attributes: ["id", "hourly_price", "price"],
        },
      ],
    });

    const rentals_history = userRentals?.map((rental) => {
      const { id: order_id, start_time, status, rented_package, rented_user } = rental;
      const { hourly_price, price } = rented_package || {};
      const { name, mobile } = rented_user || {};
      const start_on = rental?.get("start_on");

      const cost_details = calculatePriceOnRentals(start_time, hourly_price);

      return {
        order_id,
        start_time,
        start_on,
        status,
        name,
        mobile,
        net_amount: price,
        ...cost_details,
      };
    });
    sendSuccess(res, "Rental details fetched successfully", { rentals_history }, 200);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.buyItem = async (req, res, next) => {
  const { user_id } = req;
  const { box_id, package_id } = req.body;

  const start_time = new Date();

  const transaction = await db.sequelize.transaction();
  try {
    const box = await Boxes.findByPk(box_id);
    const package = await Packages.findByPk(package_id);

    if (!box) throw new ApiError(404, "Box not found");
    if (!package) throw new ApiError(404, "Package not found");

    if (box.status !== "active") throw new ApiError(400, "This box is not active");

    const isSlotsAvailable = box.available_powerbanks > 0;
    if (!isSlotsAvailable) throw new ApiError(400, "No slots available");
    const createdRental = await Rentals.create(
      {
        box_id,
        package_id,
        user_id,
        start_time: start_time.toISOString(),
      },
      {
        transaction,
      }
    );

    await box.update(
      { available_powerbanks: box.available_powerbanks - 1 },
      {
        transaction,
      }
    );

    await transaction.commit();

    sendSuccess(res, "Rental added successfully", { createdRental }, 201);
  } catch (error) {
    console.log(error);
    await transaction.rollback();
    next(error);
  }
};

// exports.rentItem = async (req, res, next) => {
//   const { user_id } = req;
//   const { box_id, battery, package_id } = req.body;

//   if (!user_id || !box_id || !package_id) {
//     return next(new ApiError(400, "User ID, Box ID, and Package ID are required"));
//   }

//   try {
//     const [user, box, package] = await Promise.all([
//       Users.findByPk(user_id, {
//         attributes: ["id", "is_verified"],
//         lock: false,
//       }),
//       Boxes.findOne({
//         where: { device_id: box_id },
//         attributes: ["id", "unique_id", "status", "available_powerbanks"],
//         lock: false,
//       }),
//       Packages.findByPk(package_id, {
//         attributes: ["id"],
//         lock: false,
//       }),
//     ]);

//     // Validation checks
//     if (!user) throw new ApiError(404, "User not found");
//     if (!user.is_verified) throw new ApiError(400, "User not verified");
//     if (!box) throw new ApiError(404, "Box not found");
//     if (!package) throw new ApiError(404, "Package not found");
//     if (box.status !== "active") throw new ApiError(400, "This box is not active");
//     if (box.available_powerbanks <= 0) throw new ApiError(400, "No powerbanks available");

//     // Check for ongoing rentals
//     const userRentals = await db.rentals.findOne({
//       where: { user_id, status: "ongoing" },
//       attributes: ["id"],
//       lock: false,
//     });
//     if (userRentals) throw new ApiError(400, "You already have an ongoing rental");

//     // External operation
//     const deviceUuid = box.unique_id;
//     const data = await startRent(deviceUuid, battery);
//     if (data?.code !== 200) {
//       return sendSuccess(res, data?.msg, { power_bank: null }, data?.code);
//     }

//     const { machineUuid, powerNo, positionUuid } = data.data;

//     // Create rental and update box in a transaction
//     const createdRental = await db.sequelize.transaction(async (t) => {
//       const rental = await Rentals.create(
//         {
//           box_id: box.id,
//           package_id,
//           user_id,
//           start_time: new Date().toISOString(),
//           power_number: powerNo,
//           machine_id: machineUuid,
//           position_id: positionUuid,
//         },
//         { transaction: t }
//       );

//       await box.update({ available_powerbanks: box.available_powerbanks - 1 }, { transaction: t });

//       return rental;
//     });

//     // Prepare response data
//     const rentalData = {
//       order_id: createdRental.id,
//       power_bank: powerNo,
//       start_time: createdRental.start_time,
//     };

//     sendSuccess(res, "Rental added successfully", rentalData, 201);
//   } catch (error) {
//     console.error("Error in rentItem:", error);
//     next(error);
//   }
// };

exports.rentItem = async (req, res, next) => {
  const { user_id } = req;
  const { box_id, battery, package_id } = req.body;

  if (!user_id || !box_id || !package_id) {
    return next(new ApiError("User ID, Box ID, and Package ID are required", 400));
  }

  try {
    const [user, box, rentalPackage] = await Promise.all([
      Users.findByPk(user_id, {
        attributes: ["id", "is_verified"],
      }),
      Boxes.findOne({
        where: { device_id: box_id },
        attributes: ["id", "unique_id", "status", "available_powerbanks"],
      }),
      Packages.findByPk(package_id, {
        attributes: ["id", "type", "duration"],
      }),
    ]);

    if (!user) throw new ApiError("User not found", 404);
    if (!user.is_verified) throw new ApiError("User not verified", 400);
    if (!box) throw new ApiError("Box not found", 404);
    if (!rentalPackage) throw new ApiError("Package not found", 404);
    if (box.status !== "active") throw new ApiError("This box is not active", 400);
    if (box.available_powerbanks <= 0) throw new ApiError("No powerbanks available", 400);

    const userRentals = await db.rentals.findOne({
      where: { user_id, status: "ongoing" },
      attributes: ["id"],
    });
    if (userRentals) throw new ApiError("You already have an ongoing rental", 400);

    const data = await startRent(box.unique_id, battery);
    if (data?.code !== 200) {
      return sendSuccess(res, data?.msg, { power_bank: null }, data?.code);
    }

    const { machineUuid, powerNo, positionUuid } = data.data;
    const { type, duration } = rentalPackage;
    const start_time = new Date().toISOString();
    const endTime = getEndTime(start_time, duration, type);

    const createdRental = await db.sequelize.transaction(async (t) => {
      const rental = await Rentals.create(
        {
          box_id: box.id,
          package_id,
          user_id,
          start_time,
          end_time: endTime,
          power_number: powerNo,
          machine_id: machineUuid,
          position_id: positionUuid,
        },
        { transaction: t }
      );

      // await box.update({ available_powerbanks: box.available_powerbanks - 1 }, { transaction: t });

      const powerbank = await Powerbanks.findOne({
        where: { unique_id: powerNo },
        transaction: t,
      });

      if (powerbank) {
        await powerbank.update(
          {
            status: "rented",
            last_synced_at: new Date(),
            box_id: null,
          },
          { transaction: t }
        );
      } else {
        console.warn(`Power bank with unique_id ${powerNo} not found`);
      }

      return rental;
    });

    const rentalData = {
      order_id: createdRental.id,
      power_bank: powerNo,
      start_time: createdRental.start_time,
    };

    sendSuccess(res, "Rental added successfully", rentalData, 201);
  } catch (error) {
    console.error("Error in rentItem:", error);
    next(error);
  }
};

exports.returnItem = async (req, res, next) => {
  const { user_id } = req;
  const { rental_id, location_id } = req.body;

  const transaction = await db.sequelize.transaction();
  try {
    const user = await Users.findByPk(user_id);
    if (!user) throw new ApiError(404, "User not found");
    const location = await Locations.findByPk(location_id);
    if (!location) throw new ApiError(404, "Location not found");

    const rentalItem = await Rentals.findByPk(rental_id, {
      attributes: ["id", "box_id", "package_id", "start_time"],
    });
    if (!rentalItem) throw new ApiError(404, "Rental not found");

    const box_id = rentalItem?.get("box_id");
    const package_id = rentalItem?.get("package_id");
    const started_on = rentalItem?.get("start_time");

    const box = await Boxes.findByPk(box_id);
    if (!box) throw new ApiError(404, "Box not found");
    const package = await Packages.findByPk(package_id);
    if (!package) throw new ApiError(404, "Package not found");

    const {} = calculateTotalPrice();

    await box.update({ available_powerbanks: box.available_powerbanks + 1 }, { transaction });

    await transaction.commit();
    return sendSuccess(
      res,
      "Power bank returned successfully",
      {
        power_bank: {
          rentalItem,
        },
      },
      201
    );
  } catch (error) {
    console.error("Error in rentItem:", error);
    next(error);
  }
};

exports.addReasonForDispute = async (req, res, next) => {
  const { rental_id, dispute } = req.body;
  try {
    const rental = await Rentals.findByPk(rental_id);
    if (!rental) throw new ApiError(404, "Rental not found");

    const createdDispute = await rental.createDispute({ reason: dispute });

    return sendSuccess(res, "Reason for dispute added successfully", createdDispute, 201);
  } catch (error) {
    console.error("Error in rentItem:", error);
    next(error);
  }
};
