const axios = require("axios");
const { ApiError } = require("../middlewares/error");

const sendOtp = async (otp, number) => {
  console.log("Sending OTP:", otp, "to number:", number);

  try {
    // Payload for Fast2SMS
    const payload = {
      route: "otp",
      variables_values: otp,
      numbers: number,
    };

    console.log("[Fast2SMS] Payload:", payload);

    const response = await axios.post(process.env.FAST2SMS_URL, payload, {
      headers: {
        authorization: process.env.FAST2SMS_API_KEY,
        "Content-Type": "application/json",
      },
    });

    console.log("[Fast2SMS] Raw Response:", response.data);

    // Fast2SMS success flag
    if (response?.data?.return === true) {
      console.log("OTP sent successfully via Fast2SMS.");
      return true;
    }

    console.error("[Fast2SMS] Failed response:", response.data);
    throw new ApiError(500, "Failed to send OTP via SMS");
  } catch (error) {
    console.error("[Fast2SMS] Error sending OTP:", {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
    });

    // Fast2SMS does not have fixed error codes like Twilio
    // but we can detect common issues from API response

    const msg = error.response?.data?.message || error.message || "SMS Error";

    if (msg.includes("invalid") || msg.includes("format")) {
      throw new ApiError(400, "Invalid phone number format");
    }

    if (msg.includes("limit") || msg.includes("rate")) {
      throw new ApiError(429, "SMS rate limit exceeded");
    }

    if (msg.includes("auth") || msg.includes("key") || msg.includes("unauthorized")) {
      throw new ApiError(401, "Invalid Fast2SMS API key");
    }

    throw new ApiError(500, "Error sending OTP via SMS");
  }
};

module.exports = { sendOtp };
