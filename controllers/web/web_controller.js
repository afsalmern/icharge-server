const { Op } = require("sequelize");
const db = require("../../models");
const { sendSuccess } = require("../../handlers/success_response_handler");
const { ApiError } = require("../../middlewares/error");

const Users = db.users;
const Packages = db.packages;
exports.getAllUsers = async (req, res, next) => {
  const { status = "all", block_status = "all", page = 1, limit = 20, keyword, from = 0, to = 0 } = req.query;
  let userCreatedFilter = {};

  if (from !== 0 && to !== 0) {
    userCreatedFilter = {
      createdAt: {
        [Op.between]: [from, to],
      },
    };
  }

  if (from !== 0 && to == 0) {
    userCreatedFilter = {
      createdAt: {
        [Op.gte]: from,
      },
    };
  }

  const offset = (page - 1) * limit;
  const parsedLimit = parseInt(limit, 10);
  const dynamicIlike = keyword ? `%${keyword}%` : `%%`;

  const whereClause = {
    ...userCreatedFilter,
    [Op.or]: [{ username: { [Op.iLike]: dynamicIlike } }],
    ...(status != "all" ? { status } : {}), // Only add status if it's defined
    ...(block_status != "all" ? { block_status } : {}), // Only add block_status if it's defined
  };

  try {
    const { rows, count } = await Users.findAndCountAll({
      attributes: ["id", "username", "mobile", "status", "block_status", "createdAt"],
      where: whereClause,
      limit: parsedLimit,
      offset,
      order: [["createdAt", "DESC"]],
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

exports.addPackage = async (req, res, next) => {
  const { name, description, price, duration, swap, type } = req.body;
  if (!req.files || !req.files["image"]) {
    throw new ApiError(400, "Package image is required");
  }
  const file = req.files["package_image"][0];
  const package_image = file.filename;
  try {
    const package = await db.packages.create({ name, description, price, duration, swap, image: package_image, type });
    sendSuccess(res, "Package added successfully", { package }, 200);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.updatePackage = async (req, res, next) => {
  const { id } = req.params;
  const { name, description, price, duration, swap, type } = req.body;

  console.log(req.files);

  const package_image = (req.files && req.files?.["image"]?.[0]?.filename) || null;

  const package = await Packages.findByPk(id);
  if (!package) {
    throw new ApiError(404, "Package not found");
  }
  const transacion = await db.sequelize.transaction();
  try {
    const updatedPackage = await package.update(
      { name, description, price, duration, swap, image: package_image ? package_image : package.image,type },
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
    const packages = await db.packages.findAll({ attributes: ["id", "name", "description", "price", "duration", "swap", "image", "type"] });
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
