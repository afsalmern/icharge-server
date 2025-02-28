const bcrypt = require("bcrypt");
const { sendSuccess } = require("../../handlers/success_response_handler");
const { ApiError } = require("../../middlewares/error");
const db = require("../../models");
const { generateOtp } = require("../../utils/generateOtp");
const { generateToken } = require("../../utils/generateToken");

const Otp = db.otps;
const User = db.users;
const Admins = db.admins;

exports.sendOtp = async (req, res, next) => {
  const { mobile } = req.body;
  try {
    const otp = generateOtp();
    if (!otp) {
      throw new ApiError(500, "Otp not genrated");
    }
    const otpData = {
      mobile,
      otp,
    };
    await Otp.create(otpData);
    sendSuccess(res, "Otp sent successfully", { otp }, 200);
  } catch (error) {
    console.error(error);
    next(error);
  }
};

exports.verifyOtp = async (req, res, next) => {
  const { mobile, otp } = req.body;

  try {
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
  } catch (error) {
    console.error(error);
    next(error);
  }
};

exports.loginAdmin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const admin = await Admins.findOne({ attributes: ["id", "email", "role", "firstName","password"], where: { email } });
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
  } catch (error) {
    console.error(error);
    next(error);
  }
};

exports.createAdmin = async (req, res) => {
  try {
    const { firstName, password, email } = req.body;

    if (!firstName || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const newAdmin = await Admins.create({ firstName, password, email });

    sendSuccess(res, "Admin created successfully", { admin: newAdmin }, 201);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
