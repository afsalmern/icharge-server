const express = require("express");
const { getHome, updatUserProfile, getUserProfile, getUserKycDetails, getRentalDetails } = require("../../controllers/user/user_controller");
const { verifyToken } = require("../../middlewares/auth");
const verifyUserExist = require("../../middlewares/check_user");
const { checkRole } = require("../../middlewares/role_check");
const router = express.Router();
//Home
router.get("/home", verifyToken, getHome);

//User profile
router.get("/profile", verifyToken,checkRole("user"),verifyUserExist, getUserProfile);
router.put("/profile", verifyToken,checkRole("user"),verifyUserExist, updatUserProfile);

//Kyc details
router.get("/kyc-details", verifyToken,verifyUserExist, getUserKycDetails);

//Rental details
router.get("/rental-details", verifyToken,verifyUserExist, getRentalDetails);


module.exports = router;
