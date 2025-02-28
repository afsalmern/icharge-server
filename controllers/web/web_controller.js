const { Op } = require("sequelize");
const db = require("../../models");
const { sendSuccess } = require("../../handlers/success_response_handler");
const { ApiError } = require("../../middlewares/error");

const Users = db.users;
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
