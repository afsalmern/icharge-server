const RazorPay = require("razorpay");

const razorpay = new RazorPay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.createOrder = async (req, res, next) => {
  const { amount } = req.body;

  const currency = "INR";
  const options = {
    amount: amount * 100,
    currency: currency,
    payment_capture: 1,
  };

  try {
    if (!amount || amount <= 0) {
      throw new Error("Amount should be a valid positive number");
    }
    const order = await razorpay.orders.create(options);
    if (!order) {
      throw new Error("Order not created");
    }
    const orderDetails = {
      id: order.id,
      currency: order.currency,
      amount: order.amount,
    };

    sendSuccess(res, "Order created successfully", { order: orderDetails }, 200);
  } catch (error) {
    console.error(error);
    next(error);
  }
};
