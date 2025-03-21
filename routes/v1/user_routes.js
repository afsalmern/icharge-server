const express = require("express");
const { getHome, updatUserProfile, getUserProfile, getPackages } = require("../../controllers/user/user_controller");
const { verifyToken } = require("../../middlewares/auth");
const { checkIsKycSubmitted, verifyUserExist } = require("../../middlewares/check_user");
const { checkRole } = require("../../middlewares/role_check");
const { getRentalHistory, buyItem, rentItem, returnItem, checkIsDeviceValid } = require("../../controllers/rentals/rentals.controller");
const upload = require("../../middlewares/multer");
const { validateKycData, validate, validateKycDataUpdate } = require("../../validators/validators");
const { uploadKyc, getUserKycDetails, updateKycStatus, updateKyc } = require("../../controllers/kyc/kyc_controller");
const { addDepositAmount, getDepositHistories, deductDepositAmount, submitWithDrawRequest } = require("../../controllers/payments/payments_controller");
const router = express.Router();

//Home
router.get("/home", verifyToken, checkRole("user"), getHome);

//Packages
router.get("/packages", verifyToken, getPackages);

//User profile
router.get("/profile", verifyToken, checkRole("user"), verifyUserExist, getUserProfile);
router.put("/profile", verifyToken, checkRole("user"), verifyUserExist, upload, updatUserProfile);

//Kyc details
router.get("/kyc-details", verifyToken, getUserKycDetails);
router.post("/kyc-details", verifyToken,checkIsKycSubmitted, upload, validateKycData, validate, uploadKyc);
router.patch("/kyc-details", verifyToken, upload, validateKycDataUpdate, validate, updateKyc);

//Rental details
router.get("/rentals-history", verifyToken, verifyUserExist, getRentalHistory);
router.post("/buy-item", verifyToken, checkRole("user"), buyItem);
router.post("/start-rent", verifyToken, checkRole("user"), rentItem);
router.post("/return-item", verifyToken, checkRole("user"), returnItem);
router.get("/validate-device", verifyToken, checkRole("user"), checkIsDeviceValid);

//Transactions
router.patch("/deposit-amount", verifyToken, checkRole("user"), addDepositAmount);
router.patch("/deduct-amount", verifyToken, checkRole("user"), deductDepositAmount);
router.post("/withdraw-request", verifyToken, checkRole("user"), submitWithDrawRequest);
router.get("/transaction-history", verifyToken, checkRole("user"), getDepositHistories);

module.exports = router;
