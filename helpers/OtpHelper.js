// const twilio = require("twilio");
// const { ApiError } = require("../middlewares/error");

// const sendOtp = async (otp, number) => {
//   console.log("Sending OTP:", otp, "to number:", number);

//   // return true;

//   const countryCode = process.env.COUNTRY_CODE;

//   const phoneWithCountryCode = `${countryCode}${number}`;

//   try {
//     // Initialize Twilio client
//     const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);

//     // Send SMS using Twilio
//     const message = await client.messages.create({
//       body: `Your OTP is: ${otp}. Valid for 10 minutes. Do not share this code.`,
//       from: process.env.TWILIO_NUMBER, // Your Twilio phone number
//       to: phoneWithCountryCode, // Recipient's number in E.164 format (e.g., +919876543210)
//     });

//     // Check if message was sent successfully
//     if (message.status === "queued" || message.status === "sent" || message.status === "delivered") {
//       console.log("OTP sent successfully. Message SID:", message.sid);
//       return true;
//     } else {
//       throw new Error(`Message status: ${message.status}`);
//     }
//   } catch (error) {
//     // Handle Twilio-specific errors
//     if (error.code) {
//       console.error("Twilio Error Code:", error.code, "Message:", error.message);

//       // Handle specific Twilio error codes
//       if (error.code === 21211) {
//         throw new ApiError(400, "Invalid phone number format");
//       } else if (error.code === 21608) {
//         throw new ApiError(403, "Unverified number (trial account limitation)");
//       } else if (error.code === 21610) {
//         throw new ApiError(403, "Number is blacklisted or blocked");
//       } else if (error.code === 20003) {
//         throw new ApiError(401, "Authentication failed - check Twilio credentials");
//       } else if (error.code === 21614) {
//         throw new ApiError(429, "Too many requests - rate limit exceeded");
//       }
//     }

//     console.error("Error sending OTP via Twilio:", error.message);
//     throw new ApiError(500, "Failed to send OTP via SMS");
//   }
// };

// module.exports = { sendOtp };

const axios = require("axios");
const { ApiError } = require("../middlewares/error");
const db = require("../models");
const TestOtps = db.test_otps;

const sendOtp = async (otp, number) => {
  console.log("Sending OTP:", otp, "to number:", number);

  const otpData = {
    mobile: number,
    otp,
  };

  await TestOtps.create(otpData);

  return true;

  try {
    // Payload for Fast2SMS
    const payload = {
      route: "dlt",
      variables_values: otp,
      numbers: number,
      message: process.env.DLT_TEMPLATE_ID,
      sender_id: process.env.SENDER,
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
