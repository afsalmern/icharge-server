const { sendSuccess } = require("../../handlers/success_response_handler");
const db = require("../../models");

const Users = db.users;

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
