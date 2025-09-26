const QRCode = require("qrcode");

const generateCode = async (deviceId) => {
  try {
    const qrCodeData = await QRCode.toDataURL(deviceId.toString());
    return qrCodeData;
  } catch (error) {
    console.error("QR Code generation failed:", error);
    throw new Error("Failed to generate QR Code");
  }
};
module.exports = generateCode;
