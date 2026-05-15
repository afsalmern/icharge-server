const express = require("express");
const { sendOtp, verifyOtp, loginAdmin, createAdmin, forgotPassword, resetPassword } = require("../../controllers/auth/auth_controller");
const { mobileNumberValidation, validate, adminSignupValidation, adminLoginValidation, forgotPasswordValidation, resetPasswordValidation } = require("../../validators/validators");
const router = express.Router();

//User onboard
router.post("/send-otp", mobileNumberValidation, validate, sendOtp);
router.post("/verify-otp", mobileNumberValidation, validate, verifyOtp);

//Admin login
router.post("/signup", adminSignupValidation, validate, createAdmin);
router.post("/login", adminLoginValidation, validate, loginAdmin);

//Admin password reset
router.post("/forgot-password", forgotPasswordValidation, validate, forgotPassword);
router.post("/reset-password", resetPasswordValidation, validate, resetPassword);

module.exports = router;
