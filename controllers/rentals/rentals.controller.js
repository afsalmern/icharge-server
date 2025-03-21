const { sendSuccess } = require("../../handlers/success_response_handler");
const { getCostOnHours, getCostOnWeeks, calculatePriceOnRentals, calculateTotalPrice } = require("../../helpers/calculatePrices");
const { startRent } = require("../../helpers/externalCalls");
const { ApiError } = require("../../middlewares/error");
const db = require("../../models");

const Boxes = db.boxes;
const Users = db.users;
const Packages = db.packages;
const Locations = db.locations;
const Rentals = db.rentals;

exports.checkIsDeviceValid = async (req, res, next) => {
  try {
    const { device_id } = req.query;
    const box = await Boxes.findOne({
      where: { device_id },
    });
    const message = box ? "Device is valid" : "Device is not valid";
    const is_scan_valid = box ? true : false;
    sendSuccess(res, message, { is_scan_valid }, 200);
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

exports.rentItem = async (req, res, next) => {
  const { user_id } = req;
  const { box_id, battery, package_id } = req.body;

  const transaction = await db.sequelize.transaction();
  try {
    const user = await Users.findByPk(user_id);
    if (!user) throw new ApiError(404, "User not found");
    if (!user.is_verified) throw new ApiError(400, "User not verified");

    const userRentals = await user?.getRentals({ attributes: ["id", "status"], where: { status: "ongoing" } });

    if (userRentals?.length > 0) throw new ApiError(400, "You already have an ongoing rental");

    const box = await Boxes.findByPk(box_id);
    const package = await Packages.findByPk(package_id);

    if (!box) throw new ApiError(404, "Box not found");
    if (!package) throw new ApiError(404, "Package not found");
    if (box.status !== "active") throw new ApiError(400, "This box is not active");
    // if (box.available_powerbanks <= 0) throw new ApiError(400, "No available power banks in this box");

    // const deviceUuid = box.unique_id;
    // const data = await startRent(deviceUuid, battery);

    // if (data?.code !== 200) {
    //   return sendSuccess(res, data?.msg, { power_bank: null }, data?.code);
    // }

    // const { machineUuid, powerNo, positionUuid } = data.data;

    const createdRental = await Rentals.create(
      {
        box_id,
        package_id,
        user_id,
        start_time: new Date().toISOString(),
        power_number: 12,
        machine_id: 12,
        position_id: 12,
      },
      { transaction }
    );

    await box.update({ available_powerbanks: box.available_powerbanks - 1 }, { transaction });

    await transaction.commit();
    return sendSuccess(res, "Rental added successfully", { power_bank: null }, 201);
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
