const { sendSuccess } = require("../../handlers/success_response_handler");
const {
  getCardData,
  getCompalaintsList,
  getYearWiseReveue,
  getPowerBankCounts,
  getLocationWiseRentalsCount,
  getCorporateWiseRentalsCount,
} = require("../../helpers/dashboardHelpers");
const { generateLightColors } = require("../../utils/color_generator");

exports.getDashboard = async (req, res, next) => {
  try {
    const cards = await getCardData();
    const complaints = await getCompalaintsList();
    const locationWiseRentalsCount = await getLocationWiseRentalsCount();
    const corporateWiseRentalCount = await getCorporateWiseRentalsCount();

    const colorsForlocationWiseRentalsCount = locationWiseRentalsCount?.length > 0 ? generateLightColors(locationWiseRentalsCount.length) : [];
    const colorsForCorporateWiseRentalCount = corporateWiseRentalCount?.length > 0 ? generateLightColors(corporateWiseRentalCount.length) : [];

    sendSuccess(
      res,
      "Dashboard data fetched successfully",
      {
        cards,
        complaints,
        locationWiseRentalsCount: {
          data: locationWiseRentalsCount,
          colors: colorsForlocationWiseRentalsCount,
        },
        corporateWiseRentalCount: {
          data: corporateWiseRentalCount,
          colors: colorsForCorporateWiseRentalCount,
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
