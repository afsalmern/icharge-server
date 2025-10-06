const { ApiError } = require("../middlewares/error");
const db = require("../models");
const { getEndTime } = require("./calculatePrices");

const startRent = async (user_id, box_id, package_id, order_id) => {
  if (!user_id || !box_id) {
    throw new ApiError("User ID and Box ID are required", 400);
  }

  const transaction = await db.sequelize.transaction();

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
      await transaction.commit();

      return {
        message: "Rental is ongoing",
        data: {},
      };
    } else {
      if (!package_id) {
        throw new ApiError(400, "Package ID is required for new rental");
      }

      const rentalPackage = await db.packages.findByPk(package_id, {
        attributes: ["id", "type", "duration", "price", "hourly_price", "swap"],
      });

      if (!rentalPackage) throw new ApiError(404, "Package not found");

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
            status: "pending",
            order_id: order_id,
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

      return { message: "Rental started successfully", data: rentalData };
    }
  } catch (error) {
    console.error("Error in rentItem:", error);
    await transaction.rollback();
    throw error;
  }
};

module.exports = {
  startRent,
};
