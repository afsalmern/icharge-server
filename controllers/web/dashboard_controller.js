const { sendSuccess } = require("../../handlers/success_response_handler");
const {
  getCardData,
  getCompalaintsList,
  getYearWiseReveue,
  getPowerBankCounts,
  getLocationWiseRentalsCount,
} = require("../../helpers/dashboardHelpers");
const { generateLightColors } = require("../../utils/color_generator");

exports.getDashboard = async (req, res, next) => {
  try {
    const cards = await getCardData();
    const complaints = await getCompalaintsList();
    const powerBankCounts = await getPowerBankCounts();
    const locationWiseRentalsCount = await getLocationWiseRentalsCount();

    const colorsForlocationWiseRentalsCount = locationWiseRentalsCount?.length > 0 ? generateLightColors(locationWiseRentalsCount.length) : [];
    const colorsForPowerBankCounts = powerBankCounts?.series?.length > 0 ? generateLightColors(powerBankCounts?.series?.length) : [];

    sendSuccess(
      res,
      "Dashboard data fetched successfully",
      {
        cards,
        complaints,
        powerBankCounts: {
          labels: powerBankCounts?.labels || [],
          series: powerBankCounts?.series || [],
          colors: colorsForPowerBankCounts,
        },
        locationWiseRentalsCount: {
          data: locationWiseRentalsCount,
          colors: colorsForlocationWiseRentalsCount,
        },
      },
      200
    );
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
