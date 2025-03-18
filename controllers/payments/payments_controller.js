const { where } = require("sequelize");
const { sendSuccess } = require("../../handlers/success_response_handler");
const db = require("../../models");

const Users = db.users;
const Transactions = db.user_transactions;

exports.addDepositAmount = async (req, res, next) => {
  try {
    const { user_id } = req;
    const deposit_amount = 500.0;

    const user = await Users.findByPk(user_id);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const updatedUser = await user.update({
      deposit_amount,
      is_verified: true,
    });

    sendSuccess(res, "Deposit amount added successfully", { user: updatedUser }, 200);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.getDepositHistories = async (req, res, next) => {
  try {
    const { user_id } = req;
    const user = await Users.findByPk(user_id);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const depositHistories = await Users.findAll({
      attributes: ["id", "deposit_amount", "outstanding_amount", "status", "created_at"],
      where: {
        id: user_id,
      },
      include: {
        model: Transactions,
        as: "transactions",
        attributes: ["id", "amount", "status", "transfer_status", "withdrawal_status", "created_at"],
      },
    });

    sendSuccess(res, "Deposit amount added successfully", { depositHistories: depositHistories[0] }, 200);
  } catch (error) {
    console.log(error);
    next(error);
  }
};
