exports.sendOtp = async (req, res) => {
  try {
    const otp = genrateOtp();
    res.json({ otp });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};
