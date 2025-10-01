const { sendSuccess } = require("../../handlers/success_response_handler");
const { calculatePriceOnRentals, getEndTime, calculateRentalCharge } = require("../../helpers/calculatePrices");
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
        [db.Sequelize.literal(`TO_CHAR("start_time", 'DD Mon YYYY')`), "start_on"],
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
          attributes: ["id", "hourly_price", "price", "type", "duration"],
        },
      ],
    });

    const getDuration = (type, duration) => {
      switch (type) {
        case "hourly":
          return `${duration} hour(s)`;
        case "weekly":
          return `${duration} week(s)`;
        case "monthly":
          return `${duration} month(s)`;
        default:
          return "N/A";
      }
    };

    const rentals_history = userRentals?.map((rental) => {
      const { id: order_id, start_time, status, rented_package, rented_user } = rental;
      const { hourly_price, price, type, duration } = rented_package || {};
      const { name, mobile } = rented_user || {};
      const start_on = rental?.get("start_on");

      console.log(start_on);

      const cost_details = calculatePriceOnRentals(start_time, hourly_price);

      return {
        order_id,
        start_time,
        start_on,
        status,
        name,
        mobile,
        net_amount: price,
        type,
        duration: getDuration(type, duration),
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

exports.rentItem = async (req, res, next) => {
  const { user_id } = req;
  const { box_id, package_id } = req.body;

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
        attributes: ["id", "unique_id", "status", "available_powerbanks", "location_id"],
      }),
    ]);

    if (!user) throw new ApiError(404, "User not found");
    if (user?.status !== "active") throw new ApiError(403, "User is inactive");
    if (user?.block_status) throw new ApiError(403, "User is blocked");
    if (!user?.is_verified) throw new ApiError(400, "User not verified");

    if (box?.available_powerbanks <= 0) throw new ApiError(400, "No powerbanks available");
    if (box?.status !== "active") throw new ApiError(400, "This box is not active");
    if (!box) throw new ApiError(404, "Box not found");

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
      sendSuccess(res, "Rental is ongoing", {}, 200);
    } else {
      if (!package_id) {
        throw new ApiError("Package ID is required for new rental", 400);
      }

      const rentalPackage = await db.packages.findByPk(package_id, {
        attributes: ["id", "type", "duration", "price", "hourly_price", "swap"],
      });

      if (!rentalPackage) throw new ApiError("Package not found", 404);

      const paymentAmount = parseFloat(rentalPackage.price) + parseFloat(user.outstanding_amount);

      const { type, duration, swap } = rentalPackage;
      const start_time = new Date();
      const endTime = getEndTime(start_time, duration, type);

      const location = await box.getLocation({ attributes: ["id", "name", "phone"] });

      const createdRental = await db.sequelize.transaction(async (t) => {
        const rental = await db.rentals.create(
          {
            box_id: box.id,
            location_id: location.id,
            package_id,
            user_id,
            start_time,
            end_time: endTime,
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
  const { rental_id } = req.body;

  const transaction = await db.sequelize.transaction();
  try {
    const rental = await db.rentals.findOne({
      where: { id: rental_id, user_id, status: "ongoing" },
      include: [
        { model: db.users, as: "rented_user" },
        { model: db.packages, as: "rented_package" },
        { model: db.boxes, as: "rented_box" },
      ],
    });

    if (!rental) throw new ApiError(404, "Ongoing rental not found");

    const returnTime = new Date();

    const { totalHours, extraHours, extraCharge, usedTime: usedTimeStr, allowedTime: allowedTimeStr } = calculateRentalCharge(rental, returnTime);

    await rental.update(
      {
        return_time: returnTime,
        extra_hours: extraHours,
        extra_charge: extraCharge,
        status: "completed",
        location_id: rental.location_id, // or box.location_id if you fetch box
      },
      { transaction }
    );
    console.log(
      `Total Hours: ${totalHours}, Extra Hours: ${extraHours}, Extra Charge: ${extraCharge}, Used Time: ${usedTimeStr}, Allowed Time: ${allowedTimeStr},`
    );

    const currentOutstanding = parseFloat(rental.rented_user.outstanding_amount) || 0;
    const outStandAmountToUpdate = currentOutstanding + extraCharge;

    console.log(`Current Outstanding: ${currentOutstanding}, Updated Outstanding: ${outStandAmountToUpdate}`);

    // Update user outstanding_amount (add extra charge)
    const user = rental.rented_user;
    await user.update({ outstanding_amount: outStandAmountToUpdate }, { transaction });

    // Update box available_powerbanks
    const box = rental.rented_box;
    await box.update({ available_powerbanks: box.available_powerbanks + 1 }, { transaction });

    // Send notification
    if (user?.device_token) {
      const notificationMessage =
        extraCharge > 0
          ? `Powerbank returned. A fine of $${extraCharge.toFixed(2)} has been added for ${extraHours.toFixed(2)} extra hours.`
          : "Thank you! Your powerbank has been returned successfully.";

      await sendFCMNotification(user.device_token, "Powerbank Returned", notificationMessage, {
        powerbank: rental.powerbank.powerNo,
        slot: rental.powerbank.positionUuid.toString(),
        extraCharge: extraCharge.toFixed(2),
      });
    }

    await transaction.commit();

    return sendSuccess(res, "Power bank returned successfully", { hoursUsed: totalHours, extraCharge, extraHours }, 201);
  } catch (error) {
    await transaction.rollback();
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

exports.test = async (req, res, next) => {
  const returnItem = new Date();
  const { id } = req.body;

  const rental = await Rentals.findByPk(id, {
    include: [{ model: Packages, as: "rented_package" }],
  });

  // 1️⃣ Total hours used
  let totalHours = (returnItem - rental.start_time) / (1000 * 60 * 60); // ms → hours
  totalHours = Math.ceil(totalHours); // round up

  // 2️⃣ Convert package duration to hours
  let packageHours;
  let packageType = rental.rented_package.type;
  switch (packageType) {
    case "hourly":
      packageHours = rental.rented_package.duration;
      break;
    case "weekly":
      packageHours = rental.rented_package.duration * 7 * 24;
      break;
    case "monthly":
      packageHours = rental.rented_package.duration * 30 * 24; // approximate
      break;
    default:
      throw new Error("Unknown package type: " + packageType);
  }

  // 3️⃣ Calculate extra hours
  let extraHours = totalHours - packageHours;
  extraHours = extraHours > 0 ? extraHours : 0;

  // 4️⃣ Calculate extra charge
  const extraCharge = extraHours * rental.rented_package.hourly_price;

  // 5️⃣ User-friendly breakdown
  let usedTimeStr;
  switch (packageType) {
    case "hourly":
      usedTimeStr = `${totalHours} hour(s) used`;
      break;
    case "weekly":
      usedTimeStr = `${Math.floor(totalHours / 24 / 7)} week(s) and ${totalHours % (24 * 7)} hour(s) used`;
      break;
    case "monthly":
      usedTimeStr = `${Math.floor(totalHours / (24 * 30))} month(s) and ${totalHours % (24 * 30)} hour(s) used`;
      break;
  }

  let allowedTimeStr;
  switch (packageType) {
    case "hourly":
      allowedTimeStr = `${packageHours} hour(s) allowed`;
      break;
    case "weekly":
      allowedTimeStr = `${rental.rented_package.duration} week(s) allowed`;
      break;
    case "monthly":
      allowedTimeStr = `${rental.rented_package.duration} month(s) allowed`;
      break;
  }

  sendSuccess(
    res,
    "Test successful",
    {
      totalHours,
      packageHours,
      extraHours,
      extraCharge,
      usedTime: usedTimeStr,
      allowedTime: allowedTimeStr,
    },
    200
  );
};
