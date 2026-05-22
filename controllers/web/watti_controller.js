const { getWattiTemplates, sendWattiTemplateMessage } = require("../../helpers/wattiHelper");
const { Users } = require("../../models");

/**
 * List all Watti templates for Admin Panel
 */
const listWattiTemplates = async (req, res) => {
  try {
    const { channelPhoneNumber, pageNumber, pageSize } = req.query;
    const templates = await getWattiTemplates(channelPhoneNumber, pageNumber, pageSize);

    if (templates && !templates.error) {
      return res.status(200).json({
        status: true,
        message: "Watti templates fetched successfully",
        data: templates,
      });
    } else {
      return res.status(400).json({
        status: false,
        message: "Failed to fetch Watti templates",
        error: templates ? templates.error : "Unknown error",
      });
    }
  } catch (error) {
    console.error("Error in listWattiTemplates controller:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Send a Watti broadcast message
 */
const sendWattiBroadcast = async (req, res) => {
  try {
    console.log("Watti Broadcast Request Body:", JSON.stringify(req.body, null, 2));
    const { 
      template_name, templateName, 
      broadcast_name, broadcastName, 
      parameters, recipients 
    } = req.body;

    const finalTemplateName = template_name || templateName;
    const finalBroadcastName = broadcast_name || broadcastName;

    // Convert string recipient to array if needed
    const finalRecipients = Array.isArray(recipients) ? recipients : (recipients ? [recipients] : []);

    if (!finalTemplateName || finalRecipients.length === 0) {
      return res.status(400).json({
        status: false,
        message: "Template name and recipients array are required",
        details: {
          templateNameMissing: !finalTemplateName,
          recipientsMissing: finalRecipients.length === 0,
          receivedTemplateName: finalTemplateName,
          receivedRecipients: recipients
        }
      });
    }

    const results = [];
    for (const number of finalRecipients) {
      const success = await sendWattiTemplateMessage(number, finalTemplateName, finalBroadcastName || "Promotion", parameters || []);
      results.push({ number, success });
    }

    return res.status(200).json({
      status: true,
      message: "Broadcast processed",
      data: results,
    });
  } catch (error) {
    console.error("Error in sendWattiBroadcast controller:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  listWattiTemplates,
  sendWattiBroadcast,
};
