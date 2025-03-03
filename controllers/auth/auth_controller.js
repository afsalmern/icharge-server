const bcrypt = require("bcrypt");
const { sendSuccess } = require("../../handlers/success_response_handler");
const { ApiError } = require("../../middlewares/error");
const db = require("../../models");
const { generateOtp } = require("../../utils/generateOtp");
const { generateToken } = require("../../utils/generateToken");
const asyncWrapper = require("../../handlers/async_handler");

const Otp = db.otps;
const User = db.users;
const Admins = db.admins;

exports.sendOtp = asyncWrapper(async (req, res, next) => {
  const { mobile } = req.body;
  const otp = generateOtp();
  const user = await User.findOne({ attributes: ["id", "status", "block_status"], where: { mobile } });

  if (user && user.block_status) {
    throw new ApiError(400, "User is blocked");
  }
  if (!otp) {
    throw new ApiError(500, "Otp not genrated");
  }
  const otpData = {
    mobile,
    otp,
  };
  await Otp.create(otpData);
  sendSuccess(res, "Otp sent successfully", { otp }, 200);
});

exports.verifyOtp = asyncWrapper(async (req, res) => {
  const { mobile, otp } = req.body;
  const otpData = await Otp.findOne({ where: { mobile } });
  if (!otpData) {
    throw new ApiError(400, "Otp not found");
  }

  if (otpData.otp !== otp) {
    throw new ApiError(400, "Invalid OTP");
  }

  // Convert `createdAt` to timestamp and check expiry
  const otpCreatedAt = new Date(otpData.createdAt).getTime();
  if (Date.now() - otpCreatedAt > 60000) {
    await Otp.destroy({ where: { mobile } });
    throw new ApiError(400, "Otp expired");
  }

  // Check if user exists or create a new one
  const [user] = await User.findOrCreate({ where: { mobile }, defaults: {} });

  // Generate token and return response
  const token = generateToken(user);
  await Otp.destroy({ where: { mobile } });

  sendSuccess(res, "Otp verified successfully", { token, user }, 200);
});

exports.loginAdmin = asyncWrapper(async (req, res) => {
  const { email, password } = req.body;

  const admin = await Admins.findOne({ attributes: ["id", "email", "role", "firstName", "password"], where: { email } });
  if (!admin) {
    throw new ApiError(404, "Admin not found");
  }

  // Compare entered password with the hashed password
  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) {
    throw new ApiError(401, "Invalid credentials");
  }

  const token = generateToken(admin);
  const adminWithToken = { ...admin.toJSON(), token };

  sendSuccess(res, "Login successful", { admin: adminWithToken }, 200);
});

exports.createAdmin = asyncWrapper(async (req, res) => {
  const { firstName, password, email } = req.body;

  if (!firstName || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const newAdmin = await Admins.create({ firstName, password, email });

  sendSuccess(res, "Admin created successfully", { admin: newAdmin }, 201);
});

exports;

exports.getAdmins = asyncWrapper(async (req, res) => {
  const admins = await Admins.findAll();
  sendSuccess(res, "Admins fetched successfully", { admins }, 200);
});
