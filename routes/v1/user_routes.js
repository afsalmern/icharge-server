const express = require("express");
const { getHome, updatUserProfile, getUserProfile, getUserKycDetails } = require("../../controllers/user/user_controller");
const { verifyToken } = require("../../middlewares/auth");
const verifyUserExist = require("../../middlewares/check_user");
const { checkRole } = require("../../middlewares/role_check");
const { getRentalDetails, buyItem } = require("../../controllers/rentals/rentals.controller");
const upload = require("../../middlewares/multer");
const router = express.Router();
//Home
router.get("/home", verifyToken, getHome);

//User profile
router.get("/profile", verifyToken, checkRole("user"), verifyUserExist, getUserProfile);
router.put("/profile", verifyToken, checkRole("user"), verifyUserExist, upload, updatUserProfile);

//Kyc details
router.get("/kyc-details", verifyToken, verifyUserExist, getUserKycDetails);

//Rental details
router.get("/rentals", verifyToken, verifyUserExist, getRentalDetails);
router.post("/buy-item", verifyToken, checkRole("user"), buyItem);

module.exports = router;
