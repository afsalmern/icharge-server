const { sendSuccess } = require("../../handlers/success_response_handler");
const { startRent, initiateRefund } = require("../../helpers/rentalsHelper");
const db = require("../../models");
const { initiateOrder, verifySignature } = require("../../helpers/razorPayHelpers");

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
    const order = await initiateOrder(options);

    sendSuccess(res, "Order created successfully", { order }, 200);
  } catch (error) {
    console.error(error);
    next(error);
  }
};

exports.verifyOrder = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, box_id, package_id } = req.body;
    const user_id = req.user_id;

    const isSignatureValid = verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);

    if (isSignatureValid) {
      const rentalsData = await startRent(user_id, box_id, package_id, razorpay_order_id);
      const { message, data } = rentalsData;
      console.log("Order verified successfully");
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

    const generatedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(req.body) // use the raw Buffer directly
      .digest("hex");

    if (generatedSignature !== signature) {
      console.log("Invalid signature");
      return res.status(400).json({ message: "Invalid signature" });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    console.log("Event:", event);
    console.log("Payload:", payload);

    switch (event) {
      case "payment.authorized":
        console.log("Payment authorized:", payload);
        break;
      case "payment.captured":
        console.log("Payment captured:", payload);
        await updateRentalPaymentStatus(db.rental_payments, payload, "success");
        break;
      case "payment.failed":
        console.log("Payment failed:", payload);
        const rentalPayment = await updateRentalPaymentStatus(db.rental_payments, payload, "failed", "rental");
        await initiateRefund(rentalPayment.payment_id, rentalPayment.user_id, "rental");
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

exports.createOrderForDeposit = async (req, res, next) => {
  const { amount } = req.body;

  const user_id = req.user_id;
  const user = await db.users.findOne({ attributes: ["id", "name"], where: { id: user_id } });

  const currency = "INR";
  const options = {
    amount: amount * 100,
    currency: currency,
    receipt: `IC_reciept-Deposit_${Date.now()}`,
    notes: {
      user: user?.name || "Guest",
      type: "deposit",
    },
  };

  try {
    if (!amount || amount <= 0) {
      throw new Error("Amount should be a valid positive number");
    }
    const order = await initiateOrder(options);

    sendSuccess(res, "Order created successfully", { order }, 200);
  } catch (error) {
    console.error(error);
    next(error);
  }
};

exports.verifyOrderForDeposit = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const isSignatureValid = verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);

    if (isSignatureValid) {
      sendSuccess(res, "Deposit Order verified successfully", {}, 200);
    } else {
      throw new Error("Order verification failed");
    }
  } catch (error) {
    console.log("error verifiying order", error);
    next(error);
  }
};

exports.depositWebhook = async (req, res, next) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    const generatedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(req.body) // use the raw Buffer directly
      .digest("hex");

    if (generatedSignature !== signature) {
      console.log("Invalid signature");
      return res.status(400).json({ message: "Invalid signature" });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    console.log("Event:", event);
    console.log("Payload:", payload);

    switch (event) {
      case "payment.authorized":
        console.log("Payment authorized:", payload);
        break;
      case "payment.captured":
        console.log("Payment captured:", payload);
        await updateRentalPaymentStatus(db.user_deposits, payload, "success");
        break;
      case "payment.failed":
        console.log("Payment failed:", payload);
        const rentalPayment = await updateRentalPaymentStatus(db.user_deposits, payload, "failed");
        await initiateRefund(rentalPayment.payment_id, rentalPayment.user_id, "deposit");
        break;
      default:
        console.log(`Unhandled event: ${event}`);
    }
    sendSuccess(res, "Webhook received successfully", {}, 200);
  } catch (error) {
    console.log("error in webhook for deposit", error);
    next(error);
  }
};
