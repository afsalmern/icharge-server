require("dotenv").config();
const amqp = require("amqplib");
const db = require("../models");
const { sendNotification } = require("../utils/sendFCMNotification"); // add this at top

const RABBITMQ_URL = "amqp://guest:guest@47.84.188.80:5672"; // Update if needed
const QUEUE = "POWER_SERVER_QUEUE"; // Replace with actual queue name

async function startConsumer() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    await channel.assertQueue(QUEUE, { durable: true });

    console.log("Waiting for messages...");

    channel.consume(QUEUE, (msg) => {
      console.log("listening");

      if (msg !== null) {
        const data = JSON.parse(msg.content.toString());
        console.log("Received:", data);
        processCallback(data);
        channel.ack(msg);
      }
    });
  } catch (error) {
    console.error("RabbitMQ connection error:", error);
  }
}

async function processCallback(data) {
  switch (data.action) {
    case 1001:
      console.log(`Device ${data.deviceUuid} is ${data.state == 1 ? "Online" : "Offline"}`);
      break;
    case 1002:
      console.log(`Full report received for Machine ${data.machineUuid}`, data.powerbanks);
      break;
    case 1003:
      if (data.state == "0") {
        console.log(`Power bank ${data.powerNo} successfully popped up`);
      } else {
        console.log(`Power bank ${data.powerNo} failed to pop up`);
      }
      break;
    case 1004:
      console.log(`Power bank ${data.powerNo} returned to position ${data.positionUuid} with power level ${data.powerAd}`);

      const box = await db.boxes.findOne({ where: { unique_id: data.deviceUuid } });
      if (!box) {
        console.warn(`Box not found for deviceUuid: ${data.deviceUuid}`);
        break;
      }

      const powerbank = await db.powerbanks.findOne({ where: { unique_id: data.powerNo } });
      if (!powerbank) {
        console.warn(`Power bank ${data.powerNo} not found in DB.`);
        break;
      }

      await powerbank.update({
        status: "available",
        battery_level: parseFloat(data.powerAd),
        slot_number: parseInt(data.positionUuid),
        last_back_time: new Date(),
        last_synced_at: new Date(),
        box_id: box.id,
      });

      console.log(`Power bank ${data.powerNo} updated successfully.`);

      const rental = await db.rentals.findOne({
        where: {
          power_number: data.powerNo,
          status: "ongoing",
        },
        include: [{ model: db.users, as: "user" }],
      });

      if (rental) {
        await rental.update({
          end_time: new Date(),
          return_time: new Date().toISOString(),
          status: "completed",
        });

        console.log(`Rental ${rental.id} completed for powerbank ${data.powerNo}.`);

        // ✅ Send FCM Notification
        const user = rental.user;
        if (user?.fcm_token) {
          await sendNotification(
            user.fcm_token,
            "Powerbank Returned",
            "Thank you! Your powerbank has been returned successfully.",
            {
              powerbank: data.powerNo,
              slot: data.positionUuid.toString(),
            }
          );
        }
      } else {
        console.warn(`No ongoing rental found for powerbank ${data.powerNo}.`);
      }

      break;

    default:
      console.log("Unknown action:", data);
  }
}

module.exports = { startConsumer };
