const express = require("express");
const { getHome, updatUserProfile, getUserProfile, getUserKycDetails, uploadKyc } = require("../../controllers/user/user_controller");
const { verifyToken } = require("../../middlewares/auth");
const { checkIsKycSubmitted, verifyUserExist } = require("../../middlewares/check_user");
const { checkRole } = require("../../middlewares/role_check");
const { getRentalDetails, buyItem } = require("../../controllers/rentals/rentals.controller");
const upload = require("../../middlewares/multer");
const { validateKycData, validate } = require("../../validators/validators");
const router = express.Router();
//Home
router.get("/home", verifyToken, getHome);

//User profile
router.get("/profile", verifyToken, checkRole("user"), verifyUserExist, getUserProfile);
router.put("/profile", verifyToken, checkRole("user"), verifyUserExist, upload, updatUserProfile);

//Kyc details
router.get("/kyc-details", verifyToken, verifyUserExist, getUserKycDetails);
router.post("/kyc-details", verifyToken, checkIsKycSubmitted,upload, validateKycData, validate, uploadKyc);

//Rental details
router.get("/rentals", verifyToken, verifyUserExist, getRentalDetails);
router.post("/buy-item", verifyToken, checkRole("user"), buyItem);

module.exports = router;
