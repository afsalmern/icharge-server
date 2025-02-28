const express = require("express");
const { getHome, updatUserProfile, getUserProfile, getUserKycDetails } = require("../../controllers/user/user_controller");
const { verifyToken } = require("../../middlewares/auth");
const verifyUserExist = require("../../middlewares/check_user");
const router = express.Router();
//Home
router.get("/home", verifyToken, getHome);

//User profile
router.get("/profile", verifyToken,verifyUserExist, getUserProfile);
router.put("/profile", verifyToken,verifyUserExist, updatUserProfile);

//Kyc details
router.get("/kyc-details", verifyToken,verifyUserExist, getUserKycDetails);

module.exports = router;
