require("dotenv").config();
const amqp = require("amqplib");

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

function processCallback(data) {
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
      break;
    default:
      console.log("Unknown action:", data);
  }
}

module.exports = { startConsumer };
