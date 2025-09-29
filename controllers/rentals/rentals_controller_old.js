const { sendSuccess } = require("../../handlers/success_response_handler");
const { getCostOnHours, getCostOnWeeks, calculatePriceOnRentals, calculateTotalPrice, getEndTime } = require("../../helpers/calculatePrices");
const { startRent, getDeviceInfoByUuid } = require("../../helpers/externalCalls");
const { sendOtp } = require("../../helpers/OtpHelper");
const { ApiError } = require("../../middlewares/error");
const db = require("../../models");
const { generateOtp } = require("../../utils/generateOtp");

const Boxes = db.boxes;
const Users = db.users;
const Packages = db.packages;
const Locations = db.locations;
const Rentals = db.rentals;
const Disputes = db.disputes;
const RentalsOtps = db.rental_otps;

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
//     return next(new ApiError("User ID, Box ID, and Package ID are required", 400));
//   }

//   try {
//     const [user, box, rentalPackage] = await Promise.all([
//       Users.findByPk(user_id, {
//         attributes: ["id", "is_verified", "block_status", "status", "outstanding_amount", "deposit_amount"],
//       }),
//       Boxes.findOne({
//         where: { device_id: box_id },
//         attributes: ["id", "unique_id", "status", "available_powerbanks"],
//       }),
//       Packages.findByPk(package_id, {
//         attributes: ["id", "type", "duration", "price", "hourly_price"],
//       }),
//     ]);

//     if (!user) throw new ApiError("User not found", 404);
//     if (!user.is_verified) throw new ApiError("User not verified", 400);
//     if (user.block_status) throw new ApiError("User is blocked", 403);
//     if (user.status !== "active") throw new ApiError("User is inactive", 403);

//     if (!box) throw new ApiError("Box not found", 404);
//     if (!rentalPackage) throw new ApiError("Package not found", 404);
//     if (box.status !== "active") throw new ApiError("This box is not active", 400);
//     if (box.available_powerbanks <= 0) throw new ApiError("No powerbanks available", 400);

//     const userRentals = await Rentals.findOne({
//       where: { user_id, status: "ongoing" },
//       attributes: ["id"],
//     });
//     if (userRentals) throw new ApiError("You already have an ongoing rental", 400);

//     const paymentAmount = parseFloat(rentalPackage.price) + parseFloat(user.outstanding_amount);

//     // Placeholder for payment gateway
//     // const paymentIntent = await processPayment(user_id, paymentAmount, `Rental payment #${package_id}`);
//     // if (paymentIntent.status !== 'succeeded') throw new ApiError('Payment failed', 402);

//     const data = await startRent(box.unique_id, battery);
//     if (data?.code !== 200) {
//       return sendSuccess(res, data?.msg, { power_bank: null }, data?.code);
//     }

//     const { machineUuid, powerNo, positionUuid } = data.data;
//     const { type, duration } = rentalPackage;
//     const start_time = new Date();
//     const endTime = getEndTime(start_time, duration, type);

//     const createdRental = await db.sequelize.transaction(async (t) => {
//       const rental = await Rentals.create(
//         {
//           box_id: box.id,
//           package_id,
//           user_id,
//           start_time,
//           end_time: endTime,
//           power_number: powerNo,
//           machine_id: machineUuid,
//           position_id: positionUuid,
//           status: "ongoing",
//           extra_charge: 0.0,
//         },
//         { transaction: t }
//       );

//       await RentalPayments.create(
//         {
//           rental_id: rental.id,
//           user_id,
//           amount: paymentAmount,
//           status: "success",
//         },
//         { transaction: t }
//       );

//       const powerbank = await Powerbanks.findOne({
//         where: { unique_id: powerNo },
//         transaction: t,
//       });

//       if (powerbank) {
//         await powerbank.update(
//           {
//             status: "rented",
//             last_synced_at: new Date(),
//             box_id: null,
//           },
//           { transaction: t }
//         );
//       } else {
//         console.warn(`Power bank with unique_id ${powerNo} not found`);
//       }

//       await user.update({ outstanding_amount: 0 }, { transaction: t });

//       return rental;
//     });

//     const rentalData = {
//       order_id: createdRental.id,
//       power_bank: powerNo,
//       start_time: createdRental.start_time,
//       payment_amount: paymentAmount,
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

  if (!user_id || !box_id) {
    return next(new ApiError("User ID and Box ID are required", 400));
  }

  try {
    const [user, box] = await Promise.all([
      db.users.findByPk(user_id, {
        attributes: [
          "id",
          "is_verified",
          "block_status",
          "status",
          "outstanding_amount",
          "deposit_amount",
          "swaps_used",
          "swaps_remaining",
          "can_swap",
        ],
      }),
      db.boxes.findOne({
        where: { device_id: box_id },
        attributes: ["id", "unique_id", "status", "available_powerbanks"],
      }),
    ]);

    if (!user) throw new ApiError("User not found", 404);
    if (!user.is_verified) throw new ApiError("User not verified", 400);
    if (user.block_status) throw new ApiError("User is blocked", 403);
    if (user.status !== "active") throw new ApiError("User is inactive", 403);

    if (!box) throw new ApiError("Box not found", 404);
    if (box.status !== "active") throw new ApiError("This box is not active", 400);
    if (box.available_powerbanks <= 0) throw new ApiError("No powerbanks available", 400);

    const ongoingRental = await db.rentals.findOne({
      where: { user_id, status: "ongoing" },
      include: [
        {
          model: db.packages,
          as: "rented_package",
          attributes: ["id", "type", "swap", "hourly_price"],
        },
      ],
    });

    if (ongoingRental) {
      const { rented_package } = ongoingRental;
      const { swap: swapLimit, type: planType } = rented_package;

      const isSwapEligible =
        (!ongoingRental.end_time || new Date(ongoingRental.end_time) > new Date()) &&
        user.is_verified &&
        !user.block_status &&
        user.status === "active" &&
        (planType === "monthly" || (swapLimit !== null && user.swaps_used < swapLimit));

      if (!isSwapEligible) {
        throw new ApiError("Not eligible for swap", 400);
      }

      const swapData = await startRent(box.unique_id, battery);
      if (swapData?.code !== 200) {
        throw new ApiError(swapData?.msg || "Failed to initiate swap", swapData?.code || 500);
      }

      const { machineUuid, powerNo, positionUuid } = swapData.data;

      const newSwapsUsed = user.swaps_used + 1;
      const newSwapsRemaining = planType === "monthly" ? null : Math.max(0, swapLimit - newSwapsUsed);
      const newCanSwap =
        (planType === "monthly" || (swapLimit !== null && newSwapsUsed < swapLimit)) &&
        user.is_verified &&
        !user.block_status &&
        user.status === "active";

      await db.sequelize.transaction(async (t) => {
        await ongoingRental.update(
          {
            power_number: powerNo,
            machine_id: machineUuid,
            position_id: positionUuid,
          },
          { transaction: t }
        );

        const powerbank = await db.powerbanks.findOne({
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

        await box.update(
          {
            available_powerbanks: db.sequelize.literal("available_powerbanks - 1"),
          },
          { transaction: t }
        );

        await user.update(
          {
            swaps_used: newSwapsUsed,
            swaps_remaining: newSwapsRemaining,
            can_swap: newCanSwap,
          },
          { transaction: t }
        );
      });

      const swapDataResponse = {
        order_id: ongoingRental.id,
        power_bank: powerNo,
        swap_count: newSwapsUsed,
      };

      sendSuccess(res, "Powerbank swapped successfully", swapDataResponse, 200);
    } else {
      if (!package_id) {
        throw new ApiError("Package ID is required for new rental", 400);
      }

      const rentalPackage = await db.packages.findByPk(package_id, {
        attributes: ["id", "type", "duration", "price", "hourly_price", "swap"],
      });

      if (!rentalPackage) throw new ApiError("Package not found", 404);

      const paymentAmount = parseFloat(rentalPackage.price) + parseFloat(user.outstanding_amount);

      const data = await startRent(box.unique_id, battery);
      if (data?.code !== 200) {
        return sendSuccess(res, data?.msg, { power_bank: null }, data?.code);
      }

      const { machineUuid, powerNo, positionUuid } = data.data;
      const { type, duration, swap } = rentalPackage;
      const start_time = new Date();
      const endTime = getEndTime(start_time, duration, type);

      const createdRental = await db.sequelize.transaction(async (t) => {
        const rental = await db.rentals.create(
          {
            box_id: box.id,
            package_id,
            user_id,
            start_time,
            end_time: endTime,
            power_number: powerNo,
            machine_id: machineUuid,
            position_id: positionUuid,
            status: "ongoing",
            extra_charge: 0.0,
          },
          { transaction: t }
        );

        await db.rental_payments.create(
          {
            rental_id: rental.id,
            user_id,
            amount: paymentAmount,
            status: "success",
          },
          { transaction: t }
        );

        const powerbank = await db.powerbanks.findOne({
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

        await box.update(
          {
            available_powerbanks: db.sequelize.literal("available_powerbanks - 1"),
          },
          { transaction: t }
        );

        await user.update(
          {
            outstanding_amount: 0,
            swaps_used: 0,
            swaps_remaining: type === "monthly" ? null : swap,
            can_swap: (type === "monthly" || swap > 0) && user.is_verified && !user.block_status && user.status === "active",
          },
          { transaction: t }
        );

        return rental;
      });

      const rentalData = {
        order_id: createdRental.id,
        power_bank: powerNo,
        start_time: createdRental.start_time,
        payment_amount: paymentAmount,
      };

      sendSuccess(res, "Rental added successfully", rentalData, 201);
    }
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

exports.sendRentalsOtp = async (req, res, next) => {
  try {
    const { device_id } = req.body;
    const user_id = req.user_id;

    // Validate request input
    if (!device_id) {
      return sendSuccess(res, "Device ID is required", { is_scan_valid: false }, 400);
    }

    // Fetch the box by device_id
    const box = await Boxes.findOne({
      where: { device_id },
    });

    const location = await box.getLocation({ attributes: ["id", "name", "phone"] });

    if (!location) {
      return sendSuccess(res, "Location not found for this device", { is_scan_valid: false }, 400);
    }

    // If no box is found, return "Device is not valid"
    if (!box) {
      return sendSuccess(res, "Device is not valid", { is_scan_valid: false }, 200);
    }
    const otp = generateOtp();

    const isOtpSend = await sendOtp(otp, location.phone);

    if (isOtpSend) {
      const getExisingOtp = await RentalsOtps.findOne({ where: { box_id: box.id, user_id, location_id: location.id } });
      if (getExisingOtp) {
        await getExisingOtp.destroy();
      }

      await RentalsOtps.create({ box_id: box.id, otp, location_id: location.id, user_id });
    }

    sendSuccess(res, "Otp sent successfully to vendor", ...(process.env.NODE_ENV === "development" ? [otp] : []), 200);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.verfiyRentalsOtp = async (req, res, next) => {
  try {
    const { otp, device_id } = req.body;
    const user_id = req.user_id;

    // Validate request input
    if (!device_id) {
      return sendSuccess(res, "Device ID is required", { is_scan_valid: false }, 400);
    }

    // Fetch the box by device_id
    const box = await Boxes.findOne({
      where: { device_id },
    });

    const location = await box.getLocation({ attributes: ["id", "name", "phone"] });

    if (!location) {
      return sendSuccess(res, "Location not found for this device", { is_scan_valid: false }, 400);
    }

    // If no box is found, return "Device is not valid"
    if (!box) {
      return sendSuccess(res, "Device is not valid", { is_scan_valid: false }, 200);
    }

    const verifyOtp = await RentalsOtps.findOne({ where: { box_id: box.id, otp, user_id, location_id: location.id } });

    if (!verifyOtp) {
      return sendSuccess(res, "Invalid Otp", { is_otp_valid: false }, 400);
    }

    const otpCreationTime = new Date(verifyOtp.createdAt);
    await verifyOtp.destroy();
    const isOtpExpired = (new Date() - otpCreationTime) / 1000 > 300; // 5 minutes
    if (isOtpExpired) {
      return sendSuccess(res, "Otp expired", { is_otp_valid: false }, 400);
    }

    sendSuccess(res, "Otp verified successfully", { is_otp_valid: true }, 200);
  } catch (error) {
    console.error("Error in rentItem:", error);
    next(error);
  }
};
