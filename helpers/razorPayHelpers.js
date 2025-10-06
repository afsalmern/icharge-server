const Razorpay = require("razorpay");
const crypto = require("crypto");

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const initiateOrder = async (options) => {
  try {
    const order = await razorpayInstance.orders.create(options);
    if (!order) {
      throw new Error("Order not created");
    }

    return {
      orderId: order?.id,
      currency: order?.currency,
      amount: order.amount,
    };
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const verifySignature = (order_id, payment_id, signature) => {
  try {
    const generatedSignature = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(`${order_id}|${payment_id}`).digest("hex");
    return generatedSignature === signature;
  } catch (error) {
    console.log("Error in verifying signature", error);
    throw error;
  }
};

module.exports = {
  initiateOrder,
  verifySignature,
};
