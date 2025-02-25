const genrateOtp = () => {
  const randomNumber = Math.floor(Math.random() * 10000);

  // Convert to string and pad with leading zeros if needed to ensure 4 digits
  return randomNumber.toString().padStart(4, "0");
};

module.exports = genrateOtp;
