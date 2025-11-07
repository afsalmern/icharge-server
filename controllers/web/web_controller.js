const { Op } = require("sequelize");
const db = require("../../models");
const { sendSuccess } = require("../../handlers/success_response_handler");
const { ApiError } = require("../../middlewares/error");
const { getHourlyPrice } = require("../../helpers/calculatePrices");
const generateCode = require("../../helpers/generateQrCode");
const deleteFile = require("../../helpers/deleteFiles");

const Users = db.users;
const Packages = db.packages;
const Boxes = db.boxes;
const Locations = db.locations;
const ChecksAndAmounts = db.checks_and_amounts;
const QRCode = db.qr_codes;
const Corporates = db.corporates;

//Data for Drop down
exports.getDropDownDatas = async (req, res, next) => {
  try {
    let { type } = req.query;
    const data = {};

    let types = type.split(",").map((t) => t.trim());

    for (const t of types) {
      switch (t) {
        case "locations":
          const locations = await Locations.findAll({
            where: { is_active: true },
            attributes: [
              ["id", "value"],
              ["name", "label"],
            ],
          });
          data["locations"] = locations;
          break;

        case "users":
          const users = await Users.findAll({
            attributes: [
              ["id", "value"],
              ["name", "label"],
            ],
          });
          data["users"] = users;
          break;

        case "devices":
          const devices = await Boxes.findAll({
            where: { status: "active" },
            attributes: [
              ["id", "value"],
              ["device_id", "label"],
            ],
          });
          data["devices"] = devices;
          break;

        case "packages":
          const packages = await Packages.findAll({
            attributes: [
              ["id", "value"],
              ["type", "label"],
            ],
          });
          data["packages"] = packages;
          break;

        case "corporates":
          const corporates = await Corporates.findAll({
            where: { is_active: true },
            attributes: [
              ["id", "value"],
              ["name", "label"],
            ],
          });
          data["corporates"] = corporates;
          break;

        default:
          break;
      }
    }

    sendSuccess(res, "Drop down data fetched successfully", { data }, 200);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

//User Actions
exports.getAllUsers = async (req, res, next) => {
  const { status = "all", block_status = "all", page = 1, limit = 20, keyword, from = 0, to = 0 } = req.query;
  let userCreatedFilter = {};

  if (from !== 0 && to !== 0) {
    userCreatedFilter = {
      created_at: {
        [Op.between]: [from, to],
      },
    };
  }

  if (from !== 0 && to == 0) {
    userCreatedFilter = {
      created_at: {
        [Op.gte]: from,
      },
    };
  }

  const offset = (page - 1) * limit;
  const parsedLimit = parseInt(limit, 10);
  const dynamicIlike = keyword ? `%${keyword}%` : `%%`;

  const whereClause = {
    ...userCreatedFilter,
    [Op.or]: [{ name: { [Op.iLike]: dynamicIlike } }],
    ...(status != "all" ? { status } : {}), // Only add status if it's defined
    ...(block_status != "all" ? { block_status } : {}), // Only add block_status if it's defined
  };

  try {
    const { rows, count } = await Users.findAndCountAll({
      attributes: ["id", "name", "mobile", "email", "avatar", "status", "block_status", "created_at", "deposit_amount", "outstanding_amount"],
      where: whereClause,
      limit: parsedLimit,
      offset,
      order: [["created_at", "DESC"]],
    });
    sendSuccess(res, "User fetched successfully", { users: rows, count }, 200);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.blockOrUnblockUser = async (req, res, next) => {
  const { id: user_id } = req.params;
  const user = await Users.findByPk(user_id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  try {
    await user.update({ block_status: !user.block_status });
    const messsage = `User ${user.block_status ? "blocked" : "unblocked"} successfully`;
    sendSuccess(res, messsage, {}, 200);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.activeOrInactiveUser = async (req, res, next) => {
  const { id: user_id } = req.params;
  const user = await Users.findByPk(user_id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  const currentStatus = user.status;
  try {
    await user.update({ status: currentStatus == "active" ? "inactive" : "active" });
    const messsage = `User ${currentStatus === "active" ? "deactivated" : "activated"} successfully`;
    sendSuccess(res, messsage, {}, 200);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

//Package Actions
exports.addPackage = async (req, res, next) => {
  const { name, description, price, duration, swap, type } = req.body;

  if (!req.files || !req.files["image"]) {
    throw new ApiError(400, "Package image is required");
  }
  const file = req.files["image"][0];
  const package_image = file.filename;

  let hourly_price = 0;

  const isFree = type === "free";
  if (!isFree) {
    hourly_price = getHourlyPrice(type, price);
  }

  try {
    const package = await db.packages.create({
      name,
      description,
      price: isFree ? 0 : price,
      duration,
      swap: isFree ? 0 : swap,
      image: package_image,
      hourly_price,
      type,
    });
    sendSuccess(res, "Package added successfully", { package }, 200);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.updatePackage = async (req, res, next) => {
  const { id } = req.params;
  const { name, description, price, duration, swap, type } = req.body;

  const package_image = (req.files && req.files?.["image"]?.[0]?.filename) || null;

  const package = await Packages.findByPk(id);
  if (!package) {
    throw new ApiError(404, "Package not found");
  }
  const transacion = await db.sequelize.transaction();
  try {
    const updatedPackage = await package.update(
      { name, description, price, duration, swap, image: package_image ? package_image : package.image, type },
      { returning: true },
      { transacion }
    );
    await transacion.commit();
    sendSuccess(res, "Package updated successfully", { updatedPackage }, 200);
  } catch (error) {
    console.error(error);
    await transacion.rollback();
    next(error);
  }
};

exports.getPackages = async (req, res, next) => {
  try {
    const packages = await db.packages.findAll({
      attributes: ["id", "name", "description", "price", "duration", "swap", "image", "type", "hourly_price"],
    });
    sendSuccess(res, "Packages fetched successfully", { packages }, 200);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.deletePackage = async (req, res, next) => {
  const { id } = req.params;
  const package = await Packages.findByPk(id);
  if (!package) {
    throw new ApiError(404, "Package not found");
  }
  try {
    await package.destroy();
    sendSuccess(res, "Package deleted successfully", {}, 200);
  } catch (error) {
    console.error(error);
    next(error);
  }
};

//Boxes Actions
exports.getBoxes = async (req, res, next) => {
  try {
    const boxes = await db.boxes.findAll({
      attributes: ["id", "unique_id", "device_id", "status", "total_powerbanks", "available_powerbanks", "location_id", "type"],
      include: [
        {
          model: db.locations,
          attributes: ["name"],
          as: "location",
        },
        {
          model: db.corporates,
          attributes: ["name"],
          as: "corporate",
        },
        {
          model: db.qr_codes,
          attributes: ["code"],
          as: "qr_code",
        },
      ],
      order: [["createdAt", "DESC"]],
    });
    sendSuccess(res, "Boxes fetched successfully", { boxes }, 200);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.addBoxes = async (req, res, next) => {
  const transaction = await db.sequelize.transaction();
  let tempFileName = null;
  try {
    const { unique_id, device_id, location_id, corporate_id, total_powerbanks, available_powerbanks } = req.body;

    if (location_id) {
      const isLocationValid = await Locations.findByPk(location_id, { attributes: ["id"] });
      if (!isLocationValid) {
        throw new ApiError(404, "Location not found");
      }

      const isBoxExist = await Boxes.findOne({
        where: { location_id },
      });

      if (isBoxExist) {
        throw new ApiError(409, "Location already has a box");
      }
    }

    if (corporate_id) {
      const isCorporateValid = await Corporates.findByPk(corporate_id, { attributes: ["id"] });
      if (!isCorporateValid) {
        throw new ApiError(404, "Corporate not found");
      }

      const isBoxExist = await Boxes.findOne({
        where: { corporate_id },
      });

      if (isBoxExist) {
        throw new ApiError(409, "Corporate already has a box");
      }
    }

    const boxes = await Boxes.findAll({
      attributes: ["unique_id", "device_id"],
    });

    if (boxes.find((box) => box.unique_id === unique_id)) {
      throw new ApiError(409, "Box with this id already exists,choose another id for box");
    }

    if (boxes.find((box) => box.device_id === device_id)) {
      throw new ApiError(409, "Box with this device id already exists,choose another device id for box");
    }

    const box = await Boxes.create(
      { unique_id, device_id, location_id, corporate_id, total_powerbanks, available_powerbanks, type: location_id ? "location" : "corporate" },
      { transaction }
    );

    const deviceId = box.device_id;

    const generatedQrCode = await generateCode(deviceId);
    tempFileName = generatedQrCode?.fileName || null;
    if (generatedQrCode) {
      await QRCode.create({ device_id: box.id, code: generatedQrCode?.filePath }, { transaction });
    }

    await transaction.commit();
    sendSuccess(res, "Box added successfully", { box }, 200);
  } catch (error) {
    console.log(error);
    if (tempFileName) {
      deleteFile(tempFileName);
    }
    await transaction.rollback();
    next(error);
  }
};

exports.getLocationWiseBoxes = async (req, res, next) => {
  const { id: location_id } = req.params;
  const isLocationValid = await Locations.findByPk(location_id, { attributes: ["id"] });
  if (!isLocationValid) {
    throw new ApiError(404, "Location not found");
  }
  try {
    const boxes = await Locations.findByPk(location_id, {
      include: [
        {
          model: Boxes,
          as: "boxes",
        },
      ],
    });
    sendSuccess(res, "Boxes for location fetched successfully", { boxes }, 200);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.deleteBoxes = async (req, res, next) => {
  const { id } = req.params;

  try {
    const box = await Boxes.findByPk(id);

    if (!box) {
      throw new ApiError(404, "Box not found");
    }

    const qrCode = await QRCode.findOne({ attributes: ["id", "code"], where: { device_id: box.id } });

    if (qrCode) {
      await deleteFile(qrCode.code);
    }
    await box.destroy();
    sendSuccess(res, "Box deleted successfully", {}, 200);
  } catch (error) {
    console.error(error);
    next(error);
  }
};

exports.updateBox = async (req, res, next) => {
  const { id } = req.params;
  const { status, available_powerbanks, location_id, total_powerbanks } = req.body;
  const isLocationValid = await Locations.findByPk(location_id, { attributes: ["id"] });

  if (!isLocationValid) {
    throw new ApiError(404, "Location not found");
  }

  const isBoxValid = await Boxes.findByPk(id, { attributes: ["id"] });
  if (!isBoxValid) {
    throw new ApiError(404, "Box not found");
  }

  const transaction = await db.sequelize.transaction();
  try {
    const box = await Boxes.findByPk(id, { transaction });
    const updatedBox = await box.update({ status, available_powerbanks, location_id, total_powerbanks }, { transaction });
    await transaction.commit();
    sendSuccess(res, "Package updated successfully", { updatedBox }, 200);
  } catch (error) {
    console.error(error);
    await transaction.rollback();
    next(error);
  }
};

exports.getChecksAndAmount = async (req, res, next) => {
  try {
    const checks_data = await ChecksAndAmounts.findAll({
      attributes: ["id", "is_kyc_enabled", "is_deposit_enabled", "deposit_amount"],
    });
    return sendSuccess(res, "Checks data fetched successfully", { checks_data }, 200);
  } catch (error) {
    console.error(error);
    return next(error);
  }
};

exports.updateChecksAndAmount = async (req, res, next) => {
  const { deposit_amount, is_kyc_enabled, is_deposit_enabled } = req.body;

  const transaction = await db.sequelize.transaction();
  try {
    const existingRecord = await ChecksAndAmounts.findOne({ transaction });

    let updatedBox;

    if (!existingRecord) {
      updatedBox = await ChecksAndAmounts.create({ deposit_amount, is_kyc_enabled, is_deposit_enabled }, { transaction });
    } else {
      await existingRecord.update({ deposit_amount, is_kyc_enabled, is_deposit_enabled }, { transaction });
      updatedBox = existingRecord;
    }

    await transaction.commit();

    return sendSuccess(res, "New changes updated successfully", { updatedBox }, 200);
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    return next(error);
  }
};
