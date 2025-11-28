const { sendSuccess } = require("../../handlers/success_response_handler");
const {
  getCardData,
  getCompalaintsList,
  getYearWiseReveue,
  getPowerBankCounts,
  getLocationWiseRentalsCount,
  getCorporateWiseRentalsCount,
} = require("../../helpers/dashboardHelpers");
const { sendOtp } = require("../../helpers/fast2smsHelper");
const db = require("../../models");
const { generateLightColors } = require("../../utils/color_generator");

exports.getDashboard = async (req, res, next) => {
  try {
    const dashboard_data = await db.boxes.findAll({
      attributes: ["id", "location_id", "status", ["total_powerbanks", "batteries"], ["available_powerbanks", "slots"], "unique_id"],
      include: {
        model: db.locations,
        as: "location",
        attributes: ["id", "name", "address", "is_active"],
        required: true,
        where: { is_active: true },
      },
      where: { status: "active", available_powerbanks: { [db.Sequelize.Op.gt]: 0 } },
    });
    return sendSuccess(res, "Dashboard data fetched successfully", { dashboard_data }, 200);
  } catch (error) {
    console.error(error);
    next(error);
  }
};

exports.getYearWiseData = async (req, res, next) => {
  const current_year = new Date().getFullYear();
  const { year = current_year } = req.query;

  try {
    const year_wise_data = await getYearWiseReveue(year);
    sendSuccess(res, "Dashboard data fetched successfully", { year_wise_data }, 200);
  } catch (error) {
    console.error(error);
    next(error);
  }
};
