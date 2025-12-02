const express = require("express");
const { addLocation, getLocations, updateLocation, deleteLocation } = require("../../controllers/locations/locations_controller");
const { verifyToken } = require("../../middlewares/auth");
const { checkRole } = require("../../middlewares/role_check");
const {
  locationDataValidation,
  validate,
  validateId,
  validatePackagesData,
  validateBoxesData,
  validateReferelCode,
  validateReferelCodeUpdate,
  validateCorporate,
  validateCorporateUpdate,
} = require("../../validators/validators");
const {
  getAllUsers,
  blockOrUnblockUser,
  activeOrInactiveUser,
  addPackage,
  getPackages,
  deletePackage,
  updatePackage,
  getBoxes,
  addBoxes,
  getLocationWiseBoxes,
  getDropDownDatas,
  updateBox,
  deleteBoxes,
  updateChecksAndAmount,
  getChecksAndAmount,
  getTestOtps,
} = require("../../controllers/web/web_controller");
const { upload, uploadComplaints } = require("../../middlewares/multer");
const { getKycDatas, updateKyc, updateKycStatus } = require("../../controllers/kyc/kyc_controller");
const { getAllRentals } = require("../../controllers/rentals/rentals.controller");
const { processWithdrawRequest, getAllWithdrawRequests, withDrawRequestStatusUpdate } = require("../../controllers/payments/deposits_controller");
const router = express.Router();

const complaintController = require("../../controllers/complaints/complaints_controller");
const powerbankController = require("../../controllers/web/powerbank_controller");
const { getDashboard, getYearWiseData } = require("../../controllers/web/dashboard_controller");

//dashboard
router.get("/dashboard", verifyToken, checkRole("admin"), getDashboard);
router.get("/year-wise-data", verifyToken, checkRole("admin"), getYearWiseData);

const { generateRentalReport, generateLocationsReport, generateRevenewReport, getUserReferels } = require("../../controllers/web/reports_controller");
const { createReferelCode, updateReferelCode } = require("../../controllers/referelCodes/codes_controller");
const { addCorporates, deleteCorporate, updateCorporate, getCorporates } = require("../../controllers/corporates/corporate_controller");

//Checks and deposit deposit_amount
router.get("/checks-and-amount", verifyToken, checkRole("admin"), getChecksAndAmount);
router.post("/checks-and-amount", verifyToken, checkRole("admin"), updateChecksAndAmount);

//Test OTPs
router.get("/test-otps", verifyToken, checkRole("admin"), getTestOtps);

//DropDownData
router.get("/dropdowns", getDropDownDatas);

//Locations
router.post("/locations", verifyToken, checkRole("admin"), locationDataValidation, validate, addLocation);
router.delete("/locations/:id", verifyToken, checkRole("admin"), deleteLocation);
router.patch("/locations/:id", verifyToken, checkRole("admin"), locationDataValidation, validate, updateLocation);
router.get("/locations", verifyToken, getLocations);

//Corporates
router.post("/corporates", verifyToken, checkRole("admin"), validateCorporate, validate, addCorporates);
router.delete("/corporates/:id", verifyToken, checkRole("admin"), deleteCorporate);
router.patch("/corporates/:id", verifyToken, checkRole("admin"), validateCorporateUpdate, validate, updateCorporate);
router.get("/corporates", verifyToken, getCorporates);

//Referel Codes
router.post("/referel-codes", verifyToken, checkRole("admin"), validateReferelCode, validate, createReferelCode);
router.patch("/referel-codes/:id", verifyToken, checkRole("admin"), validateReferelCodeUpdate, validate, updateReferelCode);

//Packages
router.get("/packages", verifyToken, checkRole("admin"), getPackages);
router.post("/packages", verifyToken, checkRole("admin"), upload, validatePackagesData, validate, addPackage);
router.delete("/packages/:id", verifyToken, deletePackage);
router.patch("/packages/:id", verifyToken, upload, validatePackagesData, validate, updatePackage);

//Boxes
router.get("/boxes", verifyToken, checkRole("admin"), getBoxes);
router.get("/boxes-location/:id", verifyToken, checkRole("admin"), getLocationWiseBoxes);
router.post("/boxes", verifyToken, checkRole("admin"), validateBoxesData, validate, addBoxes);
router.delete("/boxes/:id", verifyToken, checkRole("admin"), deleteBoxes);
router.patch("/boxes/:id", verifyToken, checkRole("admin"), validateBoxesData, validate, updateBox);

//Terms and conditions
router.post("/terms-conditions", verifyToken, checkRole("admin"), addLocation);
router.get("/terms-conditions", verifyToken, getLocations);

//Users
router.get("/users", verifyToken, checkRole("admin"), getAllUsers);
router.patch("/users/:id", verifyToken, checkRole("admin"), validateId, validate, blockOrUnblockUser);
router.patch("/user-status/:id", verifyToken, checkRole("admin"), validateId, validate, activeOrInactiveUser);

//Kyc
router.get("/kyc", verifyToken, checkRole("admin"), getKycDatas);
router.patch("/kyc/:id", verifyToken, checkRole("admin"), updateKycStatus);

//Rental
router.get("/rentals", verifyToken, checkRole("admin"), getAllRentals);

//Transactions
// router.patch("/withdraw-request", verifyToken, checkRole("admin"), processWithdrawRequest);
router.patch("/withdraw-request/:id", verifyToken, checkRole("admin"), withDrawRequestStatusUpdate);
router.get("/withdraw-request", verifyToken, getAllWithdrawRequests);

// Complaints Routes
router.get("/complaints", verifyToken, complaintController.getAllComplaints);
router.get("/complaints/:id", verifyToken, complaintController.getComplaintById);
router.patch("/complaints/:id", verifyToken, uploadComplaints, complaintController.updateComplaint);
router.patch("/complaints-status/:id", verifyToken, complaintController.updateComplaintStatus);
router.delete("/complaints/:id", verifyToken, complaintController.deleteComplaint);

router.get("/powerbank", powerbankController.getAllPowerBanks);
router.post("/powerbank", powerbankController.addPowerBank);
router.put("/powerbank/:id", powerbankController.updatePowerBank);
router.delete("/powerbank/:id", powerbankController.deletePowerBank);

router.get("/rental-report", generateRentalReport);
router.get("/revenue-report", generateRevenewReport);
router.get("/location-report", generateLocationsReport);
router.get("/user-referals", getUserReferels);

router.get("/test", getDashboard);

module.exports = router;
