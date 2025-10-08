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

const startRefund = async (payment_id, type) => {
  try {
    const paymentDetails = await razorpayInstance.payments.fetch(payment_id);

    const paymentStatus = paymentDetails?.status;
    const order_id = paymentDetails?.order_id;
    const amount = paymentDetails?.amount;

    if (paymentStatus !== "captured") {
      return false;
    }

    await razorpayInstance.payments.refund(payment_id, {
      amount,
      speed: "normal",
      notes: {
        reason: "Payment failed refund",
        payment_id: payment_id,
        type,
      },
    });

    return {
      status: true,
      order_id,
      amount: amount / 100,
    };
  } catch (error) {
    console.log("Error in initiating refund", error);
    throw error;
  }
};

module.exports = {
  initiateOrder,
  verifySignature,
  startRefund,
};
