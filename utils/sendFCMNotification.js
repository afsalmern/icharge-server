const admin = require("./firebase");

const sendFCMNotification = async (fcmToken, notification) => {
  if (!fcmToken) return;

  const message = {
    token: fcmToken,
    notification: {
      title: notification.title,
      body: notification.body,
    },
    data: notification.data || {}, // Optional custom payload
  };

  try {
    await admin.messaging().send(message);
    console.log("FCM sent to", fcmToken);
  } catch (err) {
    console.error("FCM send error:", err);
  }
};

module.exports = sendFCMNotification;
