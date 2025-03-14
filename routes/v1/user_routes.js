const express = require("express");
const { getHome, updatUserProfile, getUserProfile, getPackages } = require("../../controllers/user/user_controller");
const { verifyToken } = require("../../middlewares/auth");
const { checkIsKycSubmitted, verifyUserExist } = require("../../middlewares/check_user");
const { checkRole } = require("../../middlewares/role_check");
const { getRentalHistory, buyItem } = require("../../controllers/rentals/rentals.controller");
const upload = require("../../middlewares/multer");
const { validateKycData, validate, validateKycDataUpdate } = require("../../validators/validators");
const { uploadKyc, getUserKycDetails, updateKycStatus, updateKyc } = require("../../controllers/kyc/kyc_controller");
const { addDepositAmount } = require("../../controllers/payments/payments_controller");
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

//Deposit deposit_amount
router.patch("/deposit-amount", verifyToken, checkRole("user"), addDepositAmount);

module.exports = router;
