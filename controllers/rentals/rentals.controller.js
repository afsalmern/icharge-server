const { sendSuccess } = require("../../handlers/success_response_handler");
const { getCostOnHours, getCostOnWeeks, calculatePriceOnRentals } = require("../../helpers/calculatePrices");
const { startRent } = require("../../helpers/externalCalls");
const { ApiError } = require("../../middlewares/error");
const db = require("../../models");

const Boxes = db.boxes;
const Users = db.users;
const Packages = db.packages;
const Rentals = db.rentals;

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
      ],
    });

    const rentals_history = userRentals?.map((rental) => {
      const { id: order_id, start_time, status, rented_package } = rental;
      const { hourly_price, price } = rented_package || {};

      const start_on = rental?.get("start_on");

      const cost_details = calculatePriceOnRentals(start_time, hourly_price);

      return {
        order_id,
        start_time: start_on,
        status,
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

exports.getAllRentals = async (req, res, next) => {
  try {
    const userRentals = await Rentals.findAll({
      attributes: [
        ["id", "order_id"],
        "box_id",
        "package_id",
        [db.Sequelize.literal(`TO_CHAR("start_time", 'DD Mon YYYY, HH12:MI AM')`), "start_time"],
        "end_time",
        "status",
      ],
      include: [
        {
          model: Users,
          as: "rented_user",
          attributes: ["id", "mobile", "name"],
        },
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

    const rentals_history = userRentals?.map((rental) => {
      const { id: order_id, start_time, status, rented_package, rented_user } = rental;
      const { duration, price } = rented_package || {};
      const { name, mobile } = rented_user || {};

      const cost_details = calculatePriceOnRentals(duration, start_time, price);

      return {
        order_id,
        start_time,
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

exports.rentItem = async (req, res, next) => {
  const { user_id } = req;
  const { box_id, battery, package_id } = req.body;

  const transaction = await db.sequelize.transaction();
  try {
    const box = await Boxes.findByPk(box_id);
    const package = await Packages.findByPk(package_id);

    if (!box) throw new ApiError(404, "Box not found");
    if (!package) throw new ApiError(404, "Package not found");
    if (box.status !== "active") throw new ApiError(400, "This box is not active");
    if (box.available_powerbanks <= 0) throw new ApiError(400, "No available power banks in this box");

    const deviceUuid = box.unique_id;
    const data = await startRent(deviceUuid, battery);

    if (data?.code !== 200) {
      return sendSuccess(res, data?.msg, { power_bank: null }, data?.code);
    }

    const { machineUuid, powerNo, positionUuid } = data.data;

    const createdRental = await Rentals.create(
      {
        box_id,
        package_id,
        user_id,
        start_time: new Date().toISOString(),
        power_number: powerNo,
        machine_id: machineUuid,
        position_id: positionUuid,
      },
      { transaction }
    );

    await box.update({ available_powerbanks: box.available_powerbanks - 1 }, { transaction });

    await transaction.commit();
    return sendSuccess(res, "Rental added successfully", { createdRental }, 201);
  } catch (error) {
    console.error("Error in rentItem:", error);
    next(error);
  }
};
