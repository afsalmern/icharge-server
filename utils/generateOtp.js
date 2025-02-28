exports.generateOtp = () => {
  const randomNumber = Math.floor(Math.random() * 10000);
  return randomNumber.toString().padEnd(4, "0");
};
