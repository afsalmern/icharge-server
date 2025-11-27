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
const { generateLightColors } = require("../../utils/color_generator");

exports.getDashboard = async (req, res, next) => {
  try {
    const { mobile, otp } = req.body;

    await sendOtp(otp, mobile);
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
