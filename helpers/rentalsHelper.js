const { ApiError } = require("../middlewares/error");
const db = require("../models");
const { getEndTime } = require("./calculatePrices");

const Users = db.users;

const startRent = async (user_id, box_id, package_id, order_id) => {
  if (!user_id || !box_id) {
    throw new ApiError("User ID and Box ID are required", 400);
  }

  const transaction = await db.sequelize.transaction();

  try {
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
        attributes: ["id", "unique_id", "status", "available_powerbanks", "location_id"],
        transaction,
      }),
    ]);

    // Validations
    if (!user) throw new ApiError(404, "User not found");
    if (user.status !== "active") throw new ApiError(403, "User is inactive");
    if (user.block_status) throw new ApiError(403, "User is blocked");
    if (!user.is_verified) throw new ApiError(400, "User is not verified");

    if (!box) throw new ApiError(404, "Box not found");
    if (box.status !== "active") throw new ApiError(400, "This box is not active");
    if (box.available_powerbanks <= 0) throw new ApiError(400, "No powerbanks available");

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
      await transaction.rollback();
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
    const paymentAmount = parseFloat(rentalPackage.price) + parseFloat(user.outstanding_amount || 0);
    const { type, duration, swap } = rentalPackage;
    const start_time = new Date();
    const end_time = getEndTime(start_time, duration, type);

    // Fetch location for the box
    const location = await box.getLocation({ attributes: ["id", "name"], transaction });

    // Create rental, payment, update user and box atomically
    const rental = await db.rentals.create(
      {
        box_id: box.id,
        location_id: location.id,
        package_id,
        user_id,
        start_time,
        end_time,
        status: "ongoing",
        extra_charge: 0.0,
      },
      { transaction }
    );

    await db.rental_payments.create(
      {
        rental_id: rental.id,
        user_id,
        amount: paymentAmount,
        status: "pending",
        order_id, // Razorpay / generated order id
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
    await transaction.rollback();
    console.error("Error in startRent:", error);
    throw error;
  }
};

const updateRentalPaymentStatus = async (db, payload, status, type = "default") => {
  try {
    const paymentEntity = payload.payment.entity;
    const order_id = paymentEntity.order_id;
    const paymentsData = await db.findOne({ where: { order_id } });
    await paymentsData.update({ status });

    if (type == "rental") {
      const rentalData = paymentsData?.rental_id;
      if (rentalData) {
        const rental = await db.rentals.findOne({ where: { id: rentalData } });
        if (rental) {
          await rental.update({ status: "cancelled" });
        }
      }
    }

    return {
      payment_id: paymentEntity.id,
      user_id: paymentsData.user_id,
    };
  } catch (error) {
    console.error("Error updating rental payment status:", error);
    throw error;
  }
};

const initiateRefund = async (payment_id, user_id, type) => {
  try {
    const paymentDetails = await razorpayInstance.payments.fetch(payment_id);

    const paymentStatus = paymentDetails?.status;
    const order_id = paymentDetails?.order_id;
    const amount = paymentDetails?.amount / 100;

    if (paymentStatus === "captured") {
      await razorpayInstance.payments.refund(payment_id, {
        amount,
        speed: "normal",
        notes: {
          reason: "Payment failed refund",
          payment_id: payment_id,
        },
      });

      const refundData = await db.refunds.create({
        order_id,
        amount,
        status: "pending",
        type,
        user_id,
      });
    }
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
        transfer_status: "pending",
      },
      { transaction }
    );

    // 4️⃣ Create a user_deposits record
    await user.createUser_deposits(
      {
        amount: deposit_amount,
        order_id,
        status: "pending",
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

module.exports = {
  startRent,
  updateRentalPaymentStatus,
  initiateRefund,
  addDepositAmount,
  revertDepositAmount,
};
