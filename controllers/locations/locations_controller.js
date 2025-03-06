const { sendSuccess } = require("../../handlers/success_response_handler");
const { ApiError } = require("../../middlewares/error");
const db = require("../../models");
const Location = db.locations;

exports.addLocation = async (req, res, next) => {
  const { name, latitude, longitude, address, starting_hour, ending_hour } = req.body;
  const transaction = await db.sequelize.transaction();
  try {
    const addedLocation = await Location.create(
      {
        name,
        latitude,
        longitude,
        address,
        starting_hour,
        ending_hour,
      },
      { transaction }
    );

    await transaction.commit();

    res.status(200).json({ message: "Location added successfully", data: addedLocation });
  } catch (error) {
    console.error(error);
    await transaction.rollback();
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.updateLocation = async (req, res, next) => {
  const { name, latitude, longitude, address, starting_hour, ending_hour } = req.body;
  const { id } = req.params;

  const location = await Location.findByPk(id);
  if (!location) {
    throw new ApiError(404, "Location not found");
  }

  const transaction = await db.sequelize.transaction();
  try {
    const updated_location = await location.update(
      {
        name,
        latitude,
        longitude,
        address,
        starting_hour,
        ending_hour,
      },
      { returning: true },
      { transaction }
    );

    await transaction.commit();
    sendSuccess(res, "Location updated successfully", { location: updated_location }, 200);
  } catch (error) {
    console.error(error);
    await transaction.rollback();
    next(error);
  }
};

exports.getLocations = async (req, res) => {
  try {
    const locations = await Location.findAll({ attributes: ["id", "name", "latitude", "longitude", "address", "starting_hour", "ending_hour"] });
    return res.status(200).json({ message: "Locations fetched successfully", data: locations });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.deleteLocation = async (req, res, next) => {
  const { id } = req.params;
  const location = await Location.findByPk(id);
  if (!location) {
    throw new ApiError(404, "Location not found");
  }
  try {
    await location.destroy();
    sendSuccess(res, "Location deleted successfully", {}, 200);
  } catch (error) {
    console.error(error);
    next(error);
  }
};
