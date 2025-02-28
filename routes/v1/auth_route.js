const express = require("express");
const { sendOtp, verifyOtp, loginAdmin, createAdmin } = require("../../controllers/auth/auth_controller");
const { mobileNumberValidation, validate, adminSignupValidation, adminLoginValidation } = require("../../validators/validators");
const router = express.Router();

//User onboard
router.post("/send-otp", mobileNumberValidation, validate, sendOtp);
router.post("/verify-otp", mobileNumberValidation, validate, verifyOtp);

//Admin login
router.post("/signup", adminSignupValidation, validate, createAdmin);
router.post("/login", adminLoginValidation, validate, loginAdmin);

module.exports = router;
