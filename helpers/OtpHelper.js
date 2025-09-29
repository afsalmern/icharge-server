const { default: axios } = require("axios");

const sendOtp = async (otp, mobile1, mobile2) => {
  const numbers = [mobile1, mobile2].join(",");

  if (numbers.length === 0) {
    throw new Error("No mobile numbers provided");
  }

  try {
    const smsResponse = await axios.post(
      process.env.FAST2SMS_URL,
      {
        route: "otp",
        variables_values: otp,
        numbers,
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
    throw new Error(error);
  }
};

module.exports = { sendOtp };
