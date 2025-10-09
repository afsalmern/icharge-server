// const { default: axios } = require("axios");
// const { ApiError } = require("../middlewares/error");

// const sendOtp = async (otp, number) => {
//   console.log("Sending OTP:", otp, "to numbers:", number);

//   try {
//     const smsResponse = await axios.post(
//       process.env.FAST2SMS_URL,
//       {
//         route: "otp",
//         variables_values: otp,
//         numbers: number, // Mobile number",
//       },
//       {
//         headers: {
//           authorization: process.env.FAST2SMS_API_KEY,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     // Check if SMS was sent successfully
//     if (smsResponse.data.return !== true) {
//       throw new ApiError(402, "Failed to send OTP via SMS");
//     }
//     return true;
//   } catch (error) {
//     // Check if the error is from Fast2SMS with spam detection code
//     if (error.response && error.response.data) {
//       const errData = error.response.data;
//       // Fast2SMS spam detection error code is 995 (HTTP 400)
//       if (errData.response_code === 995) {
//         console.error("Spamming detected: Multiple OTP to same number are blocked");
//         throw new ApiError(402, "Spamming detected: please wait before requesting another OTP.");
//       }
//     }
//     console.error("Error sending OTP via SMS:", error.response?.data || error.message);
//     throw new ApiError(402, "Failed to send OTP via SMS");
//   }
// };

// module.exports = { sendOtp };

const twilio = require("twilio");
const { ApiError } = require("../middlewares/error");

const sendOtp = async (otp, number) => {
  console.log("Sending OTP:", otp, "to number:", number);

  try {
    // Initialize Twilio client
    const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);

    // Send SMS using Twilio
    const message = await client.messages.create({
      body: `Your OTP is: ${otp}. Valid for 10 minutes. Do not share this code.`,
      from: process.env.TWILIO_NUMBER, // Your Twilio phone number
      to: number, // Recipient's number in E.164 format (e.g., +919876543210)
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
