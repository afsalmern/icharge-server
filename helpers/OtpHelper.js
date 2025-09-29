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
      throw new ApiError(500, "Failed to send OTP via SMS");
    }
    return true;
  } catch (error) {
    console.error("Error sending OTP via SMS:", error?.data);
    throw new Error(error);
  }
};

module.exports = { sendOtp };
