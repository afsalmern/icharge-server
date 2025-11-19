const { ApiError } = require("../middlewares/error");
const db = require("../models");
const { getEndTime, calculateRentalCharge, calculatePriceOnRentals } = require("./calculatePrices");
const { startRefund } = require("./razorPayHelpers");
const sendFCMNotification = require("../utils/sendFCMNotification");

const Users = db.users;

const startRent = async (user_id, box_id, package_id, order_id, type, code, amount, user_hours = 1) => {
  const rentalType = type;

  const transaction = await db.sequelize.transaction();

  try {
    if (!user_id || !box_id) {
      throw new ApiError(400, "User ID and Box ID are required");
    }
    // Fetch user and box simultaneously, lock box row for update
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
        transaction,
      }),
      db.boxes.findOne({
        where: { device_id: box_id },
        attributes: ["id", "unique_id", "status", "available_powerbanks", "location_id", "corporate_id", "type"],
        transaction,
      }),
    ]);

    if (!box) {
      throw new ApiError(404, "Box not found");
    }

    console.log("user", user);

    if (box?.type !== rentalType) {
      throw new ApiError(400, "Box type does not match rental type");
    }

    // Check for ongoing rental
    const ongoingRental = await db.rentals.findOne({
      where: { user_id, status: "ongoing" },
      include: [
        {
          model: db.packages,
          as: "rented_package",
          attributes: ["id", "type", "swap", "hourly_price"],
        },
      ],
      transaction,
    });

    if (ongoingRental) {
      await transaction.commit();
      return { message: "Rental is ongoing", data: {} };
    }

    // Ensure package ID is provided
    if (!package_id) throw new ApiError(400, "Package ID is required for new rental");

    const rentalPackage = await db.packages.findByPk(package_id, {
      attributes: ["id", "type", "duration", "price", "hourly_price", "swap"],
      transaction,
    });

    if (!rentalPackage) throw new ApiError(404, "Package not found");

    // Calculate total payment amount
    const paymentAmount = parseFloat(amount) + parseFloat(user.outstanding_amount || 0);
    console.log("PAYMENT AMOUNT ===>", paymentAmount);
    const { type, duration, swap } = rentalPackage;
    const start_time = new Date();

    const packageDuration = type == "hourly" ? user_hours : duration;
    const end_time = getEndTime(start_time, packageDuration, type);

    console.log("TIME ===>", start_time);
    console.log("TIME ===>", end_time);

    let location = null;
    let corporate = null;

    rentalType == "location" ? (location = await box?.getLocation()) : (corporate = await box?.getCorporate());

    const rental = await db.rentals.create(
      {
        box_id: box.id,
        location_id: location ? location.id : null,
        corporate_id: corporate ? corporate.id : null,
        type: rentalType == "location" ? "location" : "corporate",
        package_id,
        user_id,
        start_time,
        end_time,
        rental_hours: user_hours,
        status: "ongoing",
        extra_charge: 0.0,
        code,
      },
      { transaction }
    );

    await db.rental_payments.create(
      {
        rental_id: rental.id,
        user_id,
        amount: paymentAmount,
        status: "success",
        order_id,
      },
      { transaction }
    );

    await box.update({ available_powerbanks: db.sequelize.literal("available_powerbanks - 1") }, { transaction });

    await user.update(
      {
        outstanding_amount: 0,
        swaps_used: 0,
        swaps_remaining: type === "monthly" ? null : swap,
        can_swap: (type === "monthly" || swap > 0) && user.is_verified && !user.block_status && user.status === "active",
      },
      { transaction }
    );

    await transaction.commit();

    return {
      message: "Rental started successfully",
      data: {
        rental_id: rental.id,
        start_time: rental.start_time,
        payment_amount: paymentAmount,
        order_id, // returned as-is
      },
    };
  } catch (error) {
    console.error("Error in startRent:", error);
    await transaction.rollback();
    throw error;
  }
};

const startFree = async (user_id, box_id, package_id, type, code) => {
  const rentalType = type;

  const transaction = await db.sequelize.transaction();

  try {
    if (!user_id || !box_id) {
      throw new ApiError(400, "User ID and Box ID are required");
    }
    // Fetch user and box simultaneously, lock box row for update
    const [user, box] = await Promise.all([
      db.users.findByPk(user_id, {
        attributes: ["id", "is_verified", "block_status", "status", "outstanding_amount", "deposit_amount"],
        transaction,
      }),
      db.boxes.findOne({
        where: { device_id: box_id },
        attributes: ["id", "unique_id", "status", "available_powerbanks", "location_id", "corporate_id", "type"],
        transaction,
      }),
    ]);

    if (!box) {
      throw new ApiError(404, "Box not found");
    }

    if (box?.type !== rentalType) {
      throw new ApiError(400, "Box type does not match rental type");
    }

    // Check for ongoing rental
    const ongoingRental = await db.rentals.findOne({
      where: { user_id, status: "ongoing" },
      include: [
        {
          model: db.packages,
          as: "rented_package",
          attributes: ["id", "type", "hourly_price"],
        },
      ],
      transaction,
    });

    if (ongoingRental) {
      await transaction.commit();
      return { message: "Rental is ongoing", data: {} };
    }

    // Ensure package ID is provided
    if (!package_id) throw new ApiError(400, "Package ID is required for new rental");

    const rentalPackage = await db.packages.findByPk(package_id, {
      attributes: ["id", "type", "duration", "price", "hourly_price", "swap"],
      transaction,
    });

    if (!rentalPackage) throw new ApiError(404, "Package not found");

    const { type, duration, swap } = rentalPackage;
    const start_time = new Date();

    const packageDuration = duration;
    const end_time = getEndTime(start_time, packageDuration, type);

    let location = null;
    let corporate = null;

    rentalType == "location" ? (location = await box?.getLocation()) : (corporate = await box?.getCorporate());

    const rental = await db.rentals.create(
      {
        box_id: box.id,
        location_id: location ? location.id : null,
        corporate_id: corporate ? corporate.id : null,
        type: rentalType == "location" ? "location" : "corporate",
        package_id,
        user_id,
        start_time,
        end_time,
        rental_hours: duration,
        status: "ongoing",
        extra_charge: 0.0,
        code,
      },
      { transaction }
    );

    await box.update({ available_powerbanks: db.sequelize.literal("available_powerbanks - 1") }, { transaction });

    await user.update(
      {
        outstanding_amount: 0,
        swaps_used: 0,
        swaps_remaining: null,
        can_swap: true,
      },
      { transaction }
    );

    await transaction.commit();

    return {
      message: "Rental started successfully",
      data: {
        rental_id: rental.id,
        start_time: rental.start_time,
        payment_amount: 0.0,
        order_id: null,
      },
    };
  } catch (error) {
    console.error("Error in startRent:", error);
    await transaction.rollback();
    throw error;
  }
};

const returnItem = async (user_id, rental_id, scan_type, device_id = null, location_id = null) => {
  const transaction = await db.sequelize.transaction();
  try {
    const rental = await db.rentals.findOne({
      where: { id: rental_id, user_id, status: "ongoing" },
      include: [
        { model: db.users, as: "rented_user" },
        { model: db.packages, as: "rented_package" },
        { model: db.boxes, as: "rented_box" },
      ],
      transaction,
    });

    if (!rental) throw new ApiError(404, "Ongoing rental not found");

    const start = rental.start_time;
    const rental_type = rental.type;

    // Corporate validation
    if (scan_type === "corporate") {
      const validBox = await db.boxes.findOne({
        where: { device_id },
        attributes: ["id", "corporate_id"],
        transaction,
      });

      if (!validBox || validBox.corporate_id !== rental.corporate_id) {
        await transaction.rollback();
        return { success: false };
      }
    }

    // Scan type mismatch
    if (scan_type !== rental_type) {
      await transaction.rollback();
      return { success: false };
    }

    const packageType = rental.rented_package.type;
    const duration = rental.rented_package.duration || 0;
    const hourlyPrice = rental.rented_package.hourly_price || 0;

    const returnTime = new Date();

    const { extra_hours: extraHours, extra_charge: extraCharge } = calculatePriceOnRentals(start, hourlyPrice, duration, packageType);

    await rental.update(
      {
        return_time: returnTime,
        extra_hours: extraHours,
        extra_charge: extraCharge,
        status: "completed",
        return_location_id: rental_type === "location" ? location_id : null,
      },
      { transaction }
    );

    // Update outstanding
    const user = rental.rented_user;
    const currentOutstanding = Number(user.outstanding_amount) || 0;

    await user.update({ outstanding_amount: currentOutstanding + extraCharge }, { transaction });

    // Update box powerbank stock (safe increment)
    await db.boxes.increment({ available_powerbanks: 1 }, { where: { id: rental.rented_box.id }, transaction });

    await transaction.commit();

    // Send notification (outside transaction)
    if (user?.device_token) {
      const message =
        extraCharge > 0
          ? `Powerbank returned. A fine of $${extraCharge.toFixed(2)} has been added for ${extraHours.toFixed(2)} extra hours.`
          : "Thank you! Your powerbank has been returned successfully.";

      await sendFCMNotification(user.device_token, {
        title: "Powerbank Returned",
        body: message,
        data: { extraCharge: extraCharge?.toFixed(2) || "0.00" },
      });
    }

    return { success: true };
  } catch (error) {
    await transaction.rollback();
    console.error("Error in return Item:", error);
    throw error;
  }
};

const updateRentalPaymentStatus = async (database, payload, status, type = "default") => {
  try {
    const paymentEntity = payload.payment.entity;
    const order_id = paymentEntity.order_id;

    const paymentsData = await database.findOne({ where: { order_id } });
    await paymentsData.update({ status });

    if (type == "deposit") {
      const userTransaction = await db.user_transactions.findOne({
        where: { order_id },
      });

      if (userTransaction) {
        await userTransaction.update({ transfer_status: "success" }, { transaction });
      }
    }

    if (type == "rental") {
      const rentalData = paymentsData?.rental_id;

      let updateParams = {
        rental_status: status == "success" ? "completed" : "failed",
      };

      if (status == "failed") {
        updateParams = {
          ...updateParams,
          status: "completed",
        };
      }

      console.log("UPDATE PARAMS", status);
      console.log("UPDATE PARAMS", updateParams);

      if (rentalData) {
        const rental = await db.rentals.findOne({ where: { id: rentalData } });
        if (rental) {
          await rental.update(updateParams);
        }
      }
    }

    return {
      payment_id: paymentEntity.id,
      user_id: paymentsData.user_id,
      order_id,
    };
  } catch (error) {
    console.error("Error updating rental payment status:", error);
    throw error;
  }
};

const initiateRefund = async (payment_id, user_id, type) => {
  try {
    const refundStatus = await startRefund(payment_id, type);

    if (!refundStatus) {
      throw new Error("Refund failed");
    }

    const amount = refundStatus?.amount;
    const order_id = refundStatus?.order_id;

    await db.refunds.create({
      order_id,
      amount,
      status: "pending",
      type,
      user_id,
    });
  } catch (error) {
    console.log("Error in initiating refund", error);
    throw error;
  }
};

const addDepositAmount = async (user_id, deposit_amount, order_id) => {
  const transaction = await db.sequelize.transaction();

  try {
    // 1️⃣ Update user
    const [updatedCount] = await Users.update(
      {
        deposit_amount,
        is_verified: true,
        user_preferred_method: "deposit",
      },
      {
        where: { id: user_id },
        transaction,
      }
    );

    if (updatedCount === 0) {
      throw new Error("Operation failed: user not found");
    }

    // 2️⃣ Fetch user instance for association methods
    const user = await Users.findByPk(user_id, { transaction });

    if (!user) {
      throw new Error("User not found after update");
    }

    // 3️⃣ Create a transaction record
    await user.createTransaction(
      {
        amount: deposit_amount,
        type: "deposit",
        transaction_date: new Date(),
        order_id,
        transfer_status: "success",
      },
      { transaction }
    );

    // 4️⃣ Create a user_deposits record
    await user.createUser_deposits(
      {
        amount: deposit_amount,
        order_id,
        status: "success",
      },
      { transaction }
    );

    // 5️⃣ Commit transaction
    await transaction.commit();

    return { success: true, user };
  } catch (error) {
    console.error("Error in addDepositAmount:", error);
    await transaction.rollback();
    throw error;
  }
};

const revertDepositAmount = async (user_id, order_id) => {
  const transaction = await db.sequelize.transaction();

  try {
    // 1️⃣ Reset user deposit info
    await Users.update(
      {
        deposit_amount: 0.0,
        is_verified: false,
        user_preferred_method: null,
      },
      { where: { id: user_id }, transaction }
    );

    // 2️⃣ Update user transaction status
    const userTransaction = await db.user_transactions.findOne({
      where: { order_id },
      transaction,
    });

    if (userTransaction) {
      await userTransaction.update({ transfer_status: "failed" }, { transaction });
    }

    // 3️⃣ Update user deposit status
    const userDeposit = await db.user_deposits.findOne({
      where: { order_id },
      transaction,
    });

    if (userDeposit) {
      await userDeposit.update({ status: "failed" }, { transaction });
    }

    // 4️⃣ Commit transaction
    await transaction.commit();

    return { success: true };
  } catch (error) {
    console.error("Error in revertDepositAmount:", error);
    await transaction.rollback();
    throw error;
  }
};

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

module.exports = {
  startRent,
  updateRentalPaymentStatus,
  initiateRefund,
  addDepositAmount,
  revertDepositAmount,
  returnItem,
  getDuration,
  startFree,
};
