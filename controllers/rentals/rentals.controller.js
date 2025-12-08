const { sendSuccess } = require("../../handlers/success_response_handler");
const { calculatePriceOnRentals, calculateTotalTimeUsed, isTimeBetween } = require("../../helpers/calculatePrices");
const { sendOtp } = require("../../helpers/OtpHelper");
const { addUserReferelCode } = require("../../helpers/referelCodeHelper");
const { returnItem, getDuration, startRent, startFree } = require("../../helpers/rentalsHelper");
const { ApiError } = require("../../middlewares/error");
const db = require("../../models");
const { generateOtp } = require("../../utils/generateOtp");

const Boxes = db.boxes;
const Users = db.users;
const Packages = db.packages;
const Codes = db.referel_codes;
const Rentals = db.rentals;
const Disputes = db.disputes;
const RentalsOtps = db.rental_otps;
const UserReferels = db.user_referels;

exports.checkIsDeviceValid = async (req, res, next) => {
  const { device_id } = req.query;
  const { user_id } = req;
  try {
    const userData = await Users.findByPk(user_id, { attributes: ["id", "block_status", "status"] });

    if (!userData) throw new ApiError(404, "User not found");
    if (userData.block_status) throw new ApiError(403, "User is blocked");
    if (userData.status !== "active") throw new ApiError(403, "User is inactive");

    // Validate request input
    if (!device_id) {
      return sendSuccess(res, "Device ID is required", { is_scan_valid: false }, 400);
    }

    // Fetch the box by device_id
    const box = await Boxes.findOne({
      where: { device_id },
    });

    if (!box) {
      return sendSuccess(res, "Device is not valid", { is_scan_valid: false }, 200);
    }

    const boxType = box?.type;
    const isBoxValid = box?.status === "active";

    if (boxType == "location") {
      const boxLocation = await box.getLocation({ attributes: ["id", "is_active", "starting_hour", "ending_hour"] });

      const isLocationActive = boxLocation?.is_active;

      if (!isLocationActive) {
        return sendSuccess(res, "Location is inactive", { is_scan_valid: false }, 200);
      }

      function formatTime(t) {
        // Converts "13:00:00" → "13:00"
        return t.slice(0, 5);
      }

      const isBetween = isTimeBetween(boxLocation.starting_hour, boxLocation.ending_hour);

      if (!isBetween) {
        return sendSuccess(
          res,
          `Location is inactive now. Active hours are from ${formatTime(boxLocation.starting_hour)} to ${formatTime(boxLocation.ending_hour)}.`,
          { is_scan_valid: false },
          200
        );
      }
    }

    if (boxType == "corporate") {
      const boxCorporate = await box.getCorporate({ attributes: ["id", "is_active"] });

      const isLocationActive = boxCorporate?.is_active;

      if (!isLocationActive) {
        return sendSuccess(res, "Corporate is inactive", { is_scan_valid: false }, 200);
      }
    }

    if (!isBoxValid) {
      const statusMessage = {
        inactive: "The box is currently inactive.",
        maintenance: "The box is under maintenance.",
        undefined: "Box status is unavailable.",
        active: "The box is active.",
      };

      return sendSuccess(res, statusMessage[box?.status] || `The box status is ${box?.status}.`, { is_scan_valid: false }, 200);
    }

    // Check if available_powerbanks is 0 or less
    if (box.available_powerbanks <= 0) {
      return sendSuccess(res, "No powerbanks available in this device", { is_scan_valid: false }, 200);
    }

    const entity_id = boxType == "location" ? box?.location_id : box?.corporate_id;

    const referel_code = await Codes.findOne({
      where: {
        reference_id: entity_id,
        type: boxType == "location" ? "location" : "corporate",
        is_active: true,
      },
    });

    let isCodeUsed = false;

    if (referel_code) {
      const existingUserReferel = await UserReferels.findOne({
        where: {
          user_id,
          referel_id: referel_code.id,
        },
      });

      isCodeUsed = existingUserReferel ? true : false;
    }

    // If box exists and has available powerbanks, return success
    sendSuccess(
      res,
      "Device is valid",
      {
        is_scan_valid: true,
        device_type: boxType == "location" ? "location" : "corporate",
        is_code_available: referel_code ? true : false,
        is_code_already_used: isCodeUsed,
        entity_id,
      },
      200
    );
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
        "rental_hours",
        "return_time",
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
          attributes: ["id", "hourly_price", "price", "type", "duration"],
        },
        {
          model: Disputes,
          as: "disputes",
          attributes: ["id", "reason"],
        },
        {
          model: db.rental_payments,
          as: "rental_payments",
          attributes: ["status", "amount"],
        },
      ],
      raw: true,
      nest: true,
    });

    const rentals_history = userRentals?.map((rental) => {
      const { order_id, start_time, status, return_time, rented_package, disputes, rental_payments, extra_charge: extraFromRental } = rental;
      const { hourly_price, price, duration, type } = rented_package || {};
      const { reason } = disputes || {};

      const packageDuration = duration;
      const cost_details = calculatePriceOnRentals(start_time, hourly_price, packageDuration || 0, type);
      const { extra_charge, extra_hours } = cost_details;
      const payment = Array.isArray(rental_payments) && rental_payments.length > 0 ? rental_payments[0] : rental_payments;

      const time_used = calculateTotalTimeUsed(start_time, return_time, status);

      const amountPaid = payment?.amount || payment?.dataValues?.amount || 0;

      const extraAmount = status == "ongoing" ? extra_charge : parseFloat(extraFromRental || 0);

      return {
        totalTime: time_used,
        extra_charge: extraAmount,
        extra_hours,
        order_id,
        start_time: start_time,
        status,
        net_amount: amountPaid,
        dispute: reason,
      };
    });

    sendSuccess(res, "Rental details fetched successfully", { rentals_history }, 200);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.getAllRentals = async (req, res, next) => {
  const { user, start_date } = req.query;

  const whereCondition = {};

  if (user) {
    whereCondition.user_id = user;
  }

  if (start_date) {
    const date = new Date(start_date);

    if (!isNaN(date)) {
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

      whereCondition.start_time = {
        [db.Sequelize.Op.gte]: startOfDay,
        [db.Sequelize.Op.lte]: endOfDay,
      };
    }
  }

  try {
    const userRentals = await Rentals.findAll({
      attributes: [["id", "order_id"], "box_id", "package_id", "start_time", "user_id", "end_time", "status", "rental_hours", "return_time"],
      where: whereCondition,
      order: [["start_time", "DESC"]],
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
          attributes: ["id", "hourly_price", "price", "type", "duration"],
        },
        {
          model: Disputes,
          as: "disputes",
          attributes: ["id", "reason"],
        },
      ],
    });

    const rentals_history = userRentals?.map((rental) => {
      const { id: order_id, start_time, end_time, return_time, status, rented_package, rented_user, disputes } = rental;
      const { hourly_price, price, type, duration } = rented_package || {};
      const { name, mobile } = rented_user || {};

      const packageDuration = duration;

      const cost_details = calculatePriceOnRentals(start_time, hourly_price, packageDuration || 0, type);
      const time_used = calculateTotalTimeUsed(start_time, return_time, status);

      return {
        order_id,
        disputes: disputes?.reason,
        start_time,
        end_time,
        return_time: status == "ongoing" ? null : return_time,
        status,
        name,
        mobile,
        net_amount: price,
        type,
        duration: getDuration(type, packageDuration),
        elapsed_hours: cost_details.elapsed_hours,
        current_cost: cost_details.current_cost,
        time_used: time_used,
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

exports.rentItem = async (req, res, next) => {
  try {
    const { user_id } = req;
    const { box_id, package_id, type } = req.body;

    await startFree(user_id, box_id, package_id, type);

    return sendSuccess(res, "Rental started successfully", {}, 200);
  } catch (error) {
    console.error("Error in rentItem:", error);
    next(error);
  }
};

exports.TestRent = async (req, res, next) => {
  try {
    const { user_id } = req;
    const { box_id, package_id, order_id, rental_type, code, amount, user_hours } = req.body;

    await startRent(user_id, box_id, package_id, order_id, rental_type, code, amount, user_hours);

    return sendSuccess(res, "Rental started successfully", {}, 200);
  } catch (error) {
    console.error("Error in rentItem:", error);
    next(error);
  }
};
exports.TestReturn = async (req, res, next) => {
  try {
    const { user_id } = req;
    const { rental_id, location } = req.body;

    await returnItem(user_id, rental_id, "location", null, location);

    return sendSuccess(res, "Rental started successfully", {}, 200);
  } catch (error) {
    console.error("Error in rentItem:", error);
    next(error);
  }
};

exports.deleteRental = async (req, res, next) => {
  const { rental_id } = req.body;

  try {
    const rentalItem = await Rentals.findByPk(rental_id);
    if (!rentalItem) throw new ApiError(404, "Rental not found");

    await rentalItem.destroy();

    return sendSuccess(res, "Rental deleted successfully", {}, 200);
  } catch (error) {
    console.error("Error in deleteRental:", error);
    next(error);
  }
};

exports.returnItem = async (req, res, next) => {
  const { user_id } = req;
  const { rental_id, box_id } = req.body;
  try {
    const { success } = await returnItem(user_id, rental_id, "corporate", box_id, null);
    if (!success) return sendSuccess(res, "Please return to proper corporate box", { return: false }, 400);
    return sendSuccess(res, "Item returned successfully", { return: true }, 200);
  } catch (error) {
    console.error("Error in returnItem:", error);
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

    sendSuccess(res, "Otp sent successfully to vendor", [], 200);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.verfiyRentalsOtp = async (req, res, next) => {
  try {
    const { otp, device_id, rental_id, order_type = "rental" } = req.body;
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

    let message = "Otp verified successfully";

    if (order_type == "return") {
      await returnItem(user_id, rental_id, "location", null, location.id);
      message = "Item returned successfully";
    }

    sendSuccess(res, message, { is_otp_valid: true }, 200);
  } catch (error) {
    console.error("Error in verfiying rentals otp:", error);
    next(error);
  }
};

exports.verifyReferelCode = async (req, res, next) => {
  const { referel_code, device_type, entity_id } = req.body;
  const { user_id } = req;

  try {
    const code = await Codes.findOne({ where: { code: referel_code, reference_id: entity_id, type: device_type } });

    if (!code) {
      return sendSuccess(res, "Invalid referal code", { is_code_valid: false }, 400);
    }

    if (!code.is_active || !code.is_valid) {
      return sendSuccess(res, "Referral code is not active", { is_code_valid: false }, 400);
    }

    const isUsed = await addUserReferelCode(user_id, referel_code);

    return sendSuccess(res, "Referral code is valid", { is_code_valid: true, is_code_already_used: isUsed ? true : false }, 200);
  } catch (error) {
    console.error("Error in verfiying rentals type:", error);
    next(error);
  }
};

exports.test = async (req, res, next) => {
  const { startDate, endDate } = req.body;

  const start = new Date(startDate);
  const end = new Date(endDate);

  let diffMs = end - start; // difference in milliseconds
  if (diffMs < 0) return "Invalid dates";

  const msInMinute = 1000 * 60;
  const msInHour = msInMinute * 60;
  const msInDay = msInHour * 24;

  const days = Math.floor(diffMs / msInDay);
  diffMs -= days * msInDay;

  const hours = Math.floor(diffMs / msInHour);
  diffMs -= hours * msInHour;

  const minutes = Math.floor(diffMs / msInMinute);

  let data = "";

  if (days > 0) {
    data = `${days} day${days > 1 ? "s" : ""}${hours ? " " + hours + " hour" + (hours > 1 ? "s" : "") : ""} used`;
  } else if (hours > 0) {
    data = `${hours} hour${hours > 1 ? "s" : ""}${minutes ? " " + minutes + " min" : ""} used`;
  } else {
    data = `${minutes} min used`;
  }

  res.status(200).json({ data });
};
