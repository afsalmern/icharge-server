// const RazorPay = require("razorpay");
// const { sendSuccess } = require("../../handlers/success_response_handler");
// const crypto = require('crypto');

// const razorpay = new RazorPay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// });

// exports.createOrder = async (req, res, next) => {
//   const { amount } = req.body;

//   const currency = "INR";
//   const options = {
//     amount: amount * 100,
//     currency: currency,
//     payment_capture: 1,
//   };

//   try {
//     if (!amount || amount <= 0) {
//       throw new Error("Amount should be a valid positive number");
//     }
//     const order = await razorpay.orders.create(options);
//     if (!order) {
//       throw new Error("Order not created");
//     }

//     console.log(order);

//     const orderDetails = {
//       id: order.id,
//       currency: order.currency,
//       amount: order.amount,
//     };

//     sendSuccess(res, "Order created successfully", { order: orderDetails }, 200);
//   } catch (error) {
//     console.error(error);
//     next(error);
//   }
// };

// exports.verifyOrder = async (req, res, next) => {
//   try {
//     const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

//     const sign = razorpay_order_id + "|" + razorpay_payment_id;

//     const expectedSignature = crypto.createHmac("sha256", razorpay.key_secret).update(sign.toString()).digest("hex");

//     if (razorpay_signature === expectedSignature) {
//       sendSuccess(res, "Order verified successfully", {}, 200);
//     } else {
//       throw new Error("Order verification failed");
//     }
//   } catch (error) {
//     console.log("error verifiying order", error);
//     next(error);
//   }
// };
