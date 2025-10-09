const { default: axios } = require("axios");

const sendOtp = async (otp, number) => {
  console.log("Sending OTP:", otp, "to numbers:", number);

  try {
    const smsResponse = await axios.post(
      process.env.FAST2SMS_URL,
      {
        route: "otp",
        variables_values: otp,
        numbers: number, // Mobile number",
      },
      {
        headers: {
          authorization: process.env.FAST2SMS_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    // Check if SMS was sent successfully
    if (smsResponse.data.return !== true) {
      throw new ApiError(402, "Failed to send OTP via SMS");
    }
    return true;
  } catch (error) {
    // Check if the error is from Fast2SMS with spam detection code
    if (error.response && error.response.data) {
      const errData = error.response.data;
      // Fast2SMS spam detection error code is 995 (HTTP 400)
      if (errData.response_code === 995) {
        console.error("Spamming detected: Multiple OTP to same number are blocked");
        throw new ApiError(402, "Spamming detected: please wait before requesting another OTP.");
      }
    }
    console.error("Error sending OTP via SMS:", error.response?.data || error.message);
    throw new ApiError(402, "Failed to send OTP via SMS");
  }
};

module.exports = { sendOtp };
