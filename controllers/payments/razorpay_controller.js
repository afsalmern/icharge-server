const RazorPay = require("razorpay");
const { sendSuccess } = require("../../handlers/success_response_handler");
const crypto = require("crypto");
const { startRent } = require("../../helpers/rentalsHelper");
const db = require("../../models");

const razorpayInstance = new RazorPay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.createOrder = async (req, res, next) => {
  const { amount, box_id } = req.body;

  const box = await db.boxes.findOne({ attributes: ["id", "unique_id"], where: { unique_id: box_id } });
  const user_id = req.user_id;
  const user = await db.users.findOne({ attributes: ["id", "name"], where: { id: user_id } });

  const currency = "INR";
  const options = {
    amount: amount * 100,
    currency: currency,
    receipt: `IC_reciept_${Date.now()}`,
    notes: {
      user: user?.name || "Guest",
      box: box?.unique_id || "Not Specified",
    },
  };

  try {
    if (!amount || amount <= 0) {
      throw new Error("Amount should be a valid positive number");
    }
    const order = await razorpayInstance.orders.create(options);
    if (!order) {
      throw new Error("Order not created");
    }

    console.log(order);

    const orderDetails = {
      orderId: order?.id,
      currency: order?.currency,
      amount: order.amount,
    };

    sendSuccess(res, "Order created successfully", { order: orderDetails }, 200);
  } catch (error) {
    console.error(error);
    next(error);
  }
};

exports.verifyOrder = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, box_id, package_id } = req.body;
    const user_id = req.user_id;

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (razorpay_signature === generatedSignature) {
      const rentalsData = await startRent(user_id, box_id, package_id, razorpay_order_id);
      const { message, data } = rentalsData;
      sendSuccess(res, message, data, 200);
    } else {
      throw new Error("Order verification failed");
    }
  } catch (error) {
    console.log("error verifiying order", error);
    next(error);
  }
};

exports.webhookHandler = async (req, res, next) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    const generatedSignature = crypto.createHmac("sha256", webhookSecret).update(JSON.stringify(req.body)).digest("hex");

    if (generatedSignature !== signature) {
      return res.status(400).json({ message: "Invalid signature" });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    switch (event) {
      case "payment.authorized":
        console.log("Payment authorized:", payload);
        break;
      case "payment.captured":
        console.log("Payment captured:", payload);
        const paymentEntity = payload.payment.entity;
        const order_id = paymentEntity.order_id;
        const paymentsData = await db.rental_payments.findOne({ where: { order_id } });
        await paymentsData.update({ status: "success" });
        break;
      case "payment.failed":
        console.log("Payment failed:", payload);
        const paymentFailed = payload.payment.entity;
        const order_id_failed = paymentFailed.order_id;
        const paymentsDataFailed = await db.rental_payments.findOne({ where: { order_id: order_id_failed } });
        await paymentsDataFailed.update({ status: "failed" });

        const rentalData = paymentsDataFailed?.rental_id;
        if (rentalData) {
          const rental = await db.rentals.findOne({ where: { id: rentalData } });
          if (rental) {
            await rental.update({ status: "cancelled" });
          }
        }

        //Refund

        const paymentDetails = await razorpayInstance.payments.fetch(paymentFailed.id);

        const paymentStatus = paymentDetails?.status;

        if (paymentStatus === "captured") {
          const refund = await razorpayInstance.payments.refund(paymentFailed.id, {
            amount: paymentFailed.amount,
            speed: "normal",
            notes: {
              reason: "Payment failed refund",
              payment_id: paymentFailed.id,
            },
          });
        }

        break;
      default:
        console.log(`Unhandled event: ${event}`);
    }
    sendSuccess(res, "Webhook received successfully", {}, 200);
  } catch (error) {
    console.log("error in webhook", error);
    next(error);
  }
};
