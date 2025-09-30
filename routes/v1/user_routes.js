const express = require("express");
const { getHome, updatUserProfile, getUserProfile, getPackages, deleteUser } = require("../../controllers/user/user_controller");
const { verifyToken } = require("../../middlewares/auth");
const { checkIsKycSubmitted, verifyUserExist } = require("../../middlewares/check_user");
const { checkRole } = require("../../middlewares/role_check");
const {
  getRentalHistory,
  buyItem,
  rentItem,
  returnItem,
  checkIsDeviceValid,
  addReasonForDispute,
  sendRentalsOtp,
  verfiyRentalsOtp,
  deleteRental,
} = require("../../controllers/rentals/rentals.controller");
const { upload, uploadComplaints } = require("../../middlewares/multer");
const { validateKycData, validate, validateKycDataUpdate, validateDisputeData } = require("../../validators/validators");
const { uploadKyc, getUserKycDetails, updateKycStatus, updateKyc } = require("../../controllers/kyc/kyc_controller");
const {
  addDepositAmount,
  getDepositHistories,
  deductDepositAmount,
  submitWithDrawRequest,
} = require("../../controllers/payments/payments_controller");
const router = express.Router();
const complaintController = require("../../controllers/complaints/complaints_controller");
const { createOrder } = require("../../controllers/payments/razorpay_controller");

//Home
router.get("/home", verifyToken, checkRole("user"), getHome);

//Packages
router.get("/packages", verifyToken, getPackages);

//User profile
router.get("/profile", verifyToken, checkRole("user"), verifyUserExist, getUserProfile);
router.delete("/profile", verifyToken, checkRole("user"), deleteUser);
router.put("/profile", verifyToken, checkRole("user"), verifyUserExist, upload, updatUserProfile);

//Kyc details
router.get("/kyc-details", verifyToken, getUserKycDetails);
router.post("/kyc-details", verifyToken, checkIsKycSubmitted, upload, validateKycData, validate, uploadKyc);
router.patch("/kyc-details", verifyToken, upload, validateKycDataUpdate, validate, updateKyc);

//Rental details
router.get("/rentals-history", verifyToken, verifyUserExist, getRentalHistory);
router.post("/buy-item", verifyToken, checkRole("user"), buyItem);
router.post("/start-rent", verifyToken, checkRole("user"), rentItem);
router.delete("/rentals-history", verifyToken, checkRole("user"), deleteRental);
router.post("/return-item", verifyToken, checkRole("user"), returnItem);
router.get("/validate-device", verifyToken, checkRole("user"), checkIsDeviceValid);
router.post("/add-dispute", verifyToken, checkRole("user"), validateDisputeData, validate, addReasonForDispute);
router.post("/rent-start-otp", verifyToken, checkRole("user"), sendRentalsOtp);
router.put("/verify-rental-otp", verifyToken, checkRole("user"), verfiyRentalsOtp);

// //Payments
// router.post("/create-order", verifyToken, checkRole("user"), createOrder);
// router.post("/verify-order", verifyToken, checkRole("user"), createOrder);

//Transactions
router.patch("/deposit-amount", verifyToken, checkRole("user"), addDepositAmount);
router.patch("/deduct-amount", verifyToken, checkRole("user"), deductDepositAmount);
router.post("/withdraw-request", verifyToken, checkRole("user"), submitWithDrawRequest);
router.get("/transaction-history", verifyToken, checkRole("user"), getDepositHistories);

router.post("/complaints", verifyToken, uploadComplaints, complaintController.createComplaint);
router.get("/complaints", verifyToken, complaintController.getComplaintsByUserId);
router.get("/complaints/:id", verifyToken, complaintController.getComplaintById);
router.patch("/complaints/:id", verifyToken, uploadComplaints, complaintController.updateComplaint);

module.exports = router;
