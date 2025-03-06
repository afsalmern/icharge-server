const { sendSuccess } = require("../../handlers/success_response_handler");
const { ApiError } = require("../../middlewares/error");
const db = require("../../models");

const Boxes = db.boxes;
const Packages = db.packages;
const Rentals = db.rentals;
exports.getRentalDetails = async (req, res, next) => {
  try {
    const { user } = req;
    return res.status(200).json({ user });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.buyItem = async (req, res, next) => {
  try {
    const { user_id } = req;
    const { box_id, package_id } = req.body;

    const box = await Boxes.findByPk(box_id);
    const package = await Packages.findByPk(package_id);

    if (!box) throw new ApiError(404, "Box not found");
    if (!package) throw new ApiError(404, "Package not found");

    if(box.status !== "active") throw new ApiError(400,"This box is not active")

    const start_time = new Date();

    const createdRental = await Rentals.create({
      box_id,
      package_id,
      start_time,
      user_id
    });

    sendSuccess(res, "Rental added successfully", { createdRental }, 201);
  } catch (error) {
    console.log(error);
    next(error);
  }
};
