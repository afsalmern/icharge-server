const { where } = require("sequelize");
const { sendSuccess } = require("../../handlers/success_response_handler");
const db = require("../../models");
const { ApiError } = require("../../middlewares/error");

const Users = db.users;
const Transactions = db.user_transactions;
const WithDrawRequests = db.withdraw_requests;
const ChecksAndAmount = db.checks_and_amounts;

exports.addDepositAmount = async (req, res, next) => {
  const { user_id } = req;
  // const deposit_amount = 500.0;

  const amount = await ChecksAndAmount.findAll({
    attributes: ["deposit_amount"],
  });

  const deposit_amount = amount?.[0].deposit_amount || 5.0;

  const transaction = await db.sequelize.transaction();

  try {
    const user = await Users.findByPk(user_id, { transaction });
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const [updatedCount] = await Users.update(
      {
        deposit_amount,
        is_verified: true,
        user_preferred_method: "deposit",
      },
      {
        where: { id: user_id },
        returning: true,
        transaction,
      }
    );

    if (updatedCount === 0) {
      throw new ApiError(400, "Operation failed, try again");
    }

    const updatedUser = await Users.findByPk(user_id, { transaction });

    await updatedUser.createTransaction(
      {
        amount: deposit_amount,
        type: "deposit",
        transaction_date: new Date(),
      },
      { transaction }
    );

    await transaction.commit();

    sendSuccess(res, "Deposit amount added successfully", { user: updatedUser }, 200);
  } catch (error) {
    console.error(error);
    await transaction.rollback();
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
        attributes: ["id", "amount", "transfer_status", "type", "transaction_date", "created_at"],
      },
    });

    sendSuccess(res, "Deposit amount added successfully", { depositHistories: depositHistories[0] }, 200);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.deductDepositAmount = async (req, res, next) => {
  const { user_id } = req;
  const { deduct_amount } = req.body;

  const transaction = await db.sequelize.transaction();

  try {
    const user = await Users.findByPk(user_id, { transaction });
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (user.deposit_amount == 0) {
      throw new ApiError(400, "Deposit amount is zero, cannot deduct");
    }

    if (deduct_amount > user.deposit_amount) {
      throw new ApiError(400, "Deposit amount is not enough");
    }

    const updatedDepositAmount = user.deposit_amount - deduct_amount;

    const [updatedCount] = await Users.update(
      {
        deposit_amount: updatedDepositAmount,
        is_verified: updatedDepositAmount == 0 || updatedDepositAmount < 0 ? false : true,
      },
      {
        where: { id: user_id },
        returning: true,
        transaction,
      }
    );

    if (updatedCount === 0) {
      throw new ApiError(400, "Operation failed, try again");
    }

    // Fetch the updated user after update
    const updatedUser = await Users.findByPk(user_id, { transaction });

    await updatedUser.createTransaction(
      {
        amount: deduct_amount,
        type: "withdraw",
        transaction_date: new Date(),
      },
      { transaction }
    );

    await transaction.commit(); // ✅ Commit transaction before sending response

    sendSuccess(res, "Deposit amount deducted successfully", { user: updatedUser }, 200);
  } catch (error) {
    console.error(error);
    await transaction.rollback();
    next(error);
  }
};

exports.submitWithDrawRequest = async (req, res, next) => {
  const { user_id } = req;
  const { amount_to_withdraw } = req.body;
  const transaction = await db.sequelize.transaction();
  try {
    const user = await Users.findByPk(user_id, { transaction });
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (user.outstanding_amount >= user.deposit_amount) {
      throw new ApiError(400, `You have a pending amount of ${user.outstanding_amount}, please clear it first`);
    }

    if (amount_to_withdraw > user.deposit_amount) {
      throw new ApiError(400, "Deposit amount is not enough");
    }

    if (amount_to_withdraw != user.deposit_amount) {
      throw new ApiError(400, "You are only allowed to withdraw your deposit amount");
    }

    const addedRequest = await user.createWithdraw_request(
      {
        amount: amount_to_withdraw,
      },
      { transaction }
    );

    await transaction.commit();
    sendSuccess(res, "Withdraw request added successfully", { withdraw_request: addedRequest }, 200);
  } catch (error) {
    console.error(error);
    await transaction.rollback();
    next(error);
  }
};

exports.processWithdrawRequest = async (req, res, next) => {
  const { amount, user_id, request_id, action, remarks = null } = req.body;

  const transaction = await db.sequelize.transaction();
  try {
    if (action !== "accepted") {
      throw new ApiError(400, "Invalid action");
    }
    const user = await Users.findByPk(user_id, { transaction });
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (amount != user.deposit_amount) {
      throw new ApiError(400, "You are only allowed to withdraw your deposit amount");
    }

    const requestedItem = await WithDrawRequests.findByPk(request_id, { transaction });
    if (!requestedItem) {
      throw new ApiError(404, "Withdraw request not found");
    }

    switch (action) {
      case "accepted":
        await user.createTransaction(
          {
            amount,
            type: "withdraw",
            transaction_date: new Date(),
          },
          { transaction }
        );
        await requestedItem.update({ status: "accepted", remarks }, { transaction });
        break;
      default:
        throw new ApiError(400, "Invalid action");
    }

    await transaction.commit();
    sendSuccess(res, "Withdraw request added successfully", {}, 200);
  } catch (error) {
    console.error(error);
    await transaction.rollback();
    next(error);
  }
};

exports.withDrawRequestStatusUpdate = async (req, res, next) => {
  const { status } = req.body;
  const { id } = req.params;
  const transaction = await db.sequelize.transaction();
  try {
    const requestedItem = await WithDrawRequests.findByPk(id, { transaction });
    if (!requestedItem) {
      throw new ApiError(404, "Withdraw request not found");
    }

    await requestedItem.update({ status }, { transaction });

    await transaction.commit();
    sendSuccess(res, "Withdraw request status updated successfully", {}, 200);
  } catch (error) {
    console.error(error);
    await transaction.rollback();
    next(error);
  }
};

exports.getAllWithdrawRequests = async (req, res, next) => {
  const { status = "all" } = req.query;
  const whereClause = {};

  if (status !== "all") {
    whereClause.status = status;
  }
  try {
    const withDrawRequests = await WithDrawRequests.findAll({
      where: whereClause,
      attributes: ["id", "amount", "status", "remarks", "user_id", "created_at"],
      include: {
        model: Users,
        as: "user",
        attributes: ["id", "name", "mobile", "deposit_amount", "outstanding_amount"],
      },
    });

    sendSuccess(res, "Withdraw requests fetched successfully", { withdraw_requests: withDrawRequests }, 200);
  } catch (error) {
    next(error);
  }
};
