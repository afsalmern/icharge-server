require("dotenv").config();
const amqp = require("amqplib");
const db = require("../models");
const sendFCMNotification = require("../utils/sendFCMNotification");

const RABBITMQ_URL = "amqp://guest:guest@47.84.188.80:5672"; // Update if needed
const QUEUE = "POWER_SERVER_QUEUE"; // Replace with actual queue name


async function startConsumer() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);

    // 💥 Catch connection-level errors
    connection.on("error", (err) => {
      console.error("RabbitMQ connection error:", err.message);
    });

    connection.on("close", () => {
      console.warn("RabbitMQ connection closed. Attempting reconnect...");
      setTimeout(startConsumer, 5000); // Optional: auto-reconnect
    });

    const channel = await connection.createChannel();

    // 💥 Catch channel-level errors
    channel.on("error", (err) => {
      console.error("RabbitMQ channel error:", err.message);
    });

    await channel.assertQueue(QUEUE, { durable: true });

    console.log("✅ Waiting for messages...");

    channel.consume(QUEUE, (msg) => {
      console.log("📩 Listening...");

      if (msg !== null) {
        try {
          const data = JSON.parse(msg.content.toString());
          console.log("📥 Received:", data);
          processCallback(data);
          channel.ack(msg);
        } catch (err) {
          console.error("Failed to process message:", err.message);
          // Optionally nack the message or log it somewhere
          channel.nack(msg, false, false);
        }
      }
    });
  } catch (error) {
    console.error("🚨 RabbitMQ initial connection error:", error.message);
    setTimeout(startConsumer, 5000); // Try reconnecting after 5 seconds
  }
}

async function processCallback(data) {
  console.log("Processing callback data:", data.action);
  
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
        include: [{ model: db.users, as: "rented_user" }],
      });

      if (rental) {
        await rental.update({
          end_time: new Date(),
          return_time: new Date().toISOString(),
          status: "completed",
        });

        console.log(`Rental ${rental.id} completed for powerbank ${data.powerNo}.`);

        // ✅ Send FCM Notification
        const user = rental.rented_user;
        console.log(" user ===========>", user);

        if (user?.device_token) {
          await sendFCMNotification(
            user.device_token,
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
