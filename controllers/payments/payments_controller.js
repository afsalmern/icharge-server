const { sendSuccess } = require("../../handlers/success_response_handler");
const { startRent, initiateRefund, addDepositAmount, revertDepositAmount, updateRentalPaymentStatus } = require("../../helpers/rentalsHelper");
const db = require("../../models");
const { initiateOrder, verifySignature } = require("../../helpers/razorPayHelpers");
const crypto = require("crypto");

exports.createOrder = async (req, res, next) => {
  const { amount, box_id, package_id } = req.body;

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
      type: "rental",
      user_id: user_id,
      box_id,
      package_id,
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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const isSignatureValid = verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);

    if (isSignatureValid) {
      sendSuccess(res, "Order verified successfully", {}, 200);
    } else {
      throw new Error("Order verification failed");
    }
  } catch (error) {
    console.log("error verifiying order", error);
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
      box: "Not Specified",
      type: "rental",
      user_id,
      box_id: null,
      package_id: null,
    },
  };

  try {
    if (!amount || amount <= 0) {
      throw new Error("Amount should be a valid positive number");
    }
    const order = await initiateOrder(options);
    const razorpay_order_id = order?.orderId;
    await addDepositAmount(user_id, amount, razorpay_order_id);
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

exports.webhookHandler = async (req, res, next) => {
  console.log("WEBHOOK ===========>");
  try {
    const webhookSecret = process.env.WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];
    const dataStringified = JSON.stringify(req.body);

    const generatedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(dataStringified) // use the raw Buffer directly
      .digest("hex");

    if (generatedSignature !== signature) {
      console.log("Invalid signature");
      return res.status(400).json({ message: "Invalid signature" });
    }

    const event = req.body.event;
    const payload = req.body.payload;
    const order_id = payload?.payment?.entity?.order_id;
    const type = payload?.payment?.entity?.notes?.type;
    const userId = payload?.payment?.entity?.notes?.user_id;
    const package_id = payload?.payment?.entity?.notes?.package_id;
    const box_id = payload?.payment?.entity?.notes?.box_id;
    const amount = payload?.payment?.entity?.amount / 100;

    console.log("WEBHHOOK TYPE ==========>", type);

    switch (event) {
      case "payment.authorized":
        console.log("Payment authorized:");
        break;
      case "payment.captured":
        console.log("Payment captured:");
        if (type == "rental") {
          await startRent(userId, box_id, package_id, order_id);
        } else {
          await addDepositAmount(userId, amount, order_id);
        }
        break;
      case "payment.failed":
        console.log("Payment failed:");
      default:
        console.log(`Unhandled event: ${event}`);
    }
    res.status(200).json({ status: "success", message: "Webhook received" });
  } catch (error) {
    console.log("error in webhook", error);
    next(error);
  }
};
