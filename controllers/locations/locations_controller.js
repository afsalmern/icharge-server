const { sendSuccess } = require("../../handlers/success_response_handler");
const { ApiError } = require("../../middlewares/error");
const db = require("../../models");
const Location = db.locations;
const ReferelCodes = db.referel_codes;

exports.addLocation = async (req, res, next) => {
  const { name, latitude, longitude, address, starting_hour, ending_hour, is_active, phone } = req.body;
  const transaction = await db.sequelize.transaction();

  try {
    // Duplicate phone check
    if (phone) {
      const phoneExists = await Location.findOne({ where: { phone } });
      if (phoneExists) {
        throw new ApiError(400, "Phone already exists");
      }
    }

    const addedLocation = await Location.create(
      {
        name,
        latitude,
        longitude,
        address,
        starting_hour,
        ending_hour,
        is_active,
        phone,
      },
      { transaction }
    );

    await transaction.commit();

    res.status(200).json({
      message: "Location added successfully",
      data: addedLocation,
    });
  } catch (error) {
    console.error(error);
    await transaction.rollback();
    next(error);
  }
};

exports.updateLocation = async (req, res, next) => {
  const { name, latitude, longitude, address, starting_hour, ending_hour, is_active, phone } = req.body;
  const { id } = req.params;

  const transaction = await db.sequelize.transaction();

  try {
    const location = await Location.findByPk(id);
    if (!location) {
      throw new ApiError(404, "Location not found");
    }

    // Duplicate phone check except current one
    if (phone) {
      const phoneExists = await Location.findOne({
        where: {
          phone,
          id: { [Op.ne]: id },
        },
      });

      if (phoneExists) {
        throw new ApiError(400, "Phone already exists");
      }
    }

    const updated_location = await location.update(
      {
        name,
        latitude,
        longitude,
        address,
        starting_hour,
        ending_hour,
        is_active,
        phone,
      },
      { returning: true, transaction } // fixed options
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
    const locations = await Location.findAll({
      attributes: ["id", "name", "latitude", "longitude", "address", "starting_hour", "ending_hour", "is_active", "phone"],
    });

    const corporateCodes = await ReferelCodes.findAll({
      attributes: ["id", "code", "type", "reference_id", "is_valid", "is_active"],
      where: {
        type: "location",
      },
    });

    const modifiedData = locations.map((corporate) => {
      const code = corporateCodes.find((code) => code.reference_id == corporate.id);
      const referralCode = code
        ? {
            id: code.id,
            code: code.code,
            is_valid: code.is_valid,
            is_active: code.is_active,
          }
        : null;
      return {
        ...corporate.dataValues,
        referral_code: referralCode,
      };
    });

    return res.status(200).json({ message: "Locations fetched successfully", data: modifiedData });
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
