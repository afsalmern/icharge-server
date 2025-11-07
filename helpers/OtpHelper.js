const twilio = require("twilio");
const { ApiError } = require("../middlewares/error");

const sendOtp = async (otp, number) => {
  console.log("Sending OTP:", otp, "to number:", number);

  const countryCode = process.env.COUNTRY_CODE;

  const phoneWithCountryCode = `${countryCode}${number}`;

  try {
    // Initialize Twilio client
    const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);

    // Send SMS using Twilio
    const message = await client.messages.create({
      body: `Your OTP is: ${otp}. Valid for 10 minutes. Do not share this code.`,
      from: process.env.TWILIO_NUMBER, // Your Twilio phone number
      to: phoneWithCountryCode, // Recipient's number in E.164 format (e.g., +919876543210)
    });

    // Check if message was sent successfully
    if (message.status === "queued" || message.status === "sent" || message.status === "delivered") {
      console.log("OTP sent successfully. Message SID:", message.sid);
      return true;
    } else {
      throw new Error(`Message status: ${message.status}`);
    }
  } catch (error) {
    // Handle Twilio-specific errors
    if (error.code) {
      console.error("Twilio Error Code:", error.code, "Message:", error.message);

      // Handle specific Twilio error codes
      if (error.code === 21211) {
        throw new ApiError(400, "Invalid phone number format");
      } else if (error.code === 21608) {
        throw new ApiError(403, "Unverified number (trial account limitation)");
      } else if (error.code === 21610) {
        throw new ApiError(403, "Number is blacklisted or blocked");
      } else if (error.code === 20003) {
        throw new ApiError(401, "Authentication failed - check Twilio credentials");
      } else if (error.code === 21614) {
        throw new ApiError(429, "Too many requests - rate limit exceeded");
      }
    }

    console.error("Error sending OTP via Twilio:", error.message);
    throw new ApiError(500, "Failed to send OTP via SMS");
  }
};

module.exports = { sendOtp };
