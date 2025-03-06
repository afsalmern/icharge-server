const { sendSuccess } = require("../../handlers/success_response_handler");
const { getCostOnHours, getCostOnWeeks } = require("../../helpers/calculatePrices");
const { ApiError } = require("../../middlewares/error");
const db = require("../../models");

const Boxes = db.boxes;
const Packages = db.packages;
const Rentals = db.rentals;
exports.getRentalDetails = async (req, res, next) => {
  try {
    const { user_id } = req;
    const userRentals = await Rentals.findAll({
      where: { user_id },
      attributes: [["id", "order_id"], "box_id", "package_id", "start_time", "end_time", "status"],
      include: [
        {
          model: Boxes,
          as: "rented_box",
          attributes: ["id", "status", "unique_id"],
        },
        {
          model: Packages,
          as: "rented_package",
          attributes: ["id", "duration", "type", "price"],
        },
      ],
    });

    const modifiedResult = userRentals?.map((rentals) => {
      const package_type = rentals?.rented_package?.type;
      const start_on = rentals?.start_time;
      const package_duration = rentals?.rented_package?.duration;
      const price_for_duration = rentals?.rented_package?.price;

      let cost_details = null;

      switch (package_type) {
        case "hourly":
          cost_details = getCostOnHours(package_duration, start_on, price_for_duration);
          break;
        case "weekly":
          cost_details = getCostOnWeeks(package_duration, start_on, price_for_duration);
          break;
      }

      return {
        ...rentals.toJSON(),
        cost_details,
      };
    });

    sendSuccess(res, "Rental details fetched successfully", { modifiedResult }, 200);
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
