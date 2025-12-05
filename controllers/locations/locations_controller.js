const { Op } = require("sequelize");
const { sendSuccess } = require("../../handlers/success_response_handler");
const { ApiError } = require("../../middlewares/error");
const db = require("../../models");
const { createReferelCode, getAndUpdateReferelCode, deleteReferelCode } = require("../../helpers/referelCodeHelper");
const Location = db.locations;
const ReferelCodes = db.referel_codes;

exports.addLocation = async (req, res, next) => {
  const { name, latitude, longitude, address, starting_hour, ending_hour, is_active, phone, code } = req.body;
  const transaction = await db.sequelize.transaction();

  try {
    // Duplicate phone check (with transaction)
    if (phone) {
      const phoneExists = await Location.findOne({ where: { phone }, transaction });
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

    if (code) {
      const locationId = addedLocation.id;
      await createReferelCode(locationId, "location", code, transaction);
    }

    await transaction.commit();

    res.status(200).json({
      message: "Location added successfully",
      data: addedLocation,
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

exports.updateLocation = async (req, res, next) => {
  const { name, latitude, longitude, address, starting_hour, ending_hour, is_active, phone, code } = req.body;
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

    if (code) {
      await getAndUpdateReferelCode(id, "location", code, transaction);
    } else {
      await deleteReferelCode(id, "location", transaction);
    }

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
    let { page = 1, limit = 10, status = "all" } = req.query;

    page = Number(page);
    limit = Number(limit);

    const offset = (page - 1) * limit;

    // Build WHERE condition
    const whereCondition = {};
    if (status !== "all") {
      whereCondition.is_active = status === "active" ? true : false;
    }

    // Fetch paginated locations
    const { rows: locations, count: totalItems } = await Location.findAndCountAll({
      attributes: ["id", "name", "latitude", "longitude", "address", "starting_hour", "ending_hour", "is_active", "phone"],
      where: whereCondition,
      limit,
      offset,
      order: [["id", "DESC"]],
    });

    // Fetch referral codes linked to locations
    const corporateCodes = await ReferelCodes.findAll({
      attributes: ["id", "code", "type", "reference_id", "is_valid", "is_active"],
      where: { type: "location" },
    });

    // Merge referral codes into the locations result
    const modifiedData = locations.map((loc) => {
      const code = corporateCodes.find((c) => c.reference_id == loc.id);
      return {
        ...loc.dataValues,
        referral_code: code ? code.code : null,
      };
    });

    // Pagination Meta
    const totalPages = Math.ceil(totalItems / limit);

    const pagination = {
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };

    sendSuccess(res, "Locations fetched successfully", { data: modifiedData, pagination }, 200);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.deleteLocation = async (req, res, next) => {
  const { id } = req.params;
  const transaction = await db.sequelize.transaction();
  try {
    const location = await Location.findByPk(id);
    if (!location) {
      throw new ApiError(404, "Location not found");
    }
    await location.destroy();
    await deleteReferelCode(id, "location", transaction);
    await transaction.commit();
    sendSuccess(res, "Location deleted successfully", {}, 200);
  } catch (error) {
    console.error(error);
    await transaction.rollback();
    next(error);
  }
};
