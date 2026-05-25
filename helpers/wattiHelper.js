const axios = require("axios");



const generatePromoCode = (phone) => {
  const last4 = phone.slice(-4);

  const uniquePart = Date.now().toString().slice(-3);

  return `ICHARGE${last4}${uniquePart}`;
};

const sendWattiTemplateMessage = async (whatsappNumber, templateName, broadcastName, parameters) => {
  try {

    return true

    const baseUrl = process.env.WATTI_BASE_URL;
    const tenantId = process.env.WATTI_TENANT_ID;
    const token = process.env.WATTI_TOKEN;

    if (!baseUrl || !tenantId || !token) {
      console.warn("Watti configuration missing in environment variables");
      return false;
    }

    const url = `${baseUrl}/${tenantId}/api/v1/sendTemplateMessage?whatsappNumber=${whatsappNumber}`;
    const payload = {
      template_name: templateName,
      broadcast_name: broadcastName,
      parameters: parameters,
    };



    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.status === 200 || response.status === 201) {
      console.log(`Watti message sent to ${whatsappNumber} successfully.`);
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error sending Watti template message:", error.response?.data || error.message);
    return false;
  }
};


const getWattiTemplates = async (channelPhoneNumber = "", pageNumber = 1, pageSize = 10) => {
  try {
    const baseUrl = process.env.WATTI_BASE_URL;
    const tenantId = process.env.WATTI_TENANT_ID;
    const token = process.env.WATTI_TOKEN;

    if (!baseUrl || !tenantId || !token) {
      return { error: "Watti configuration missing in environment variables" };
    }

    let url = `${baseUrl}/${tenantId}/api/v1/getMessageTemplates?pageNumber=${pageNumber}&pageSize=${pageSize}`;
    console.log(`url${url}`);
    if (channelPhoneNumber) {
      url += `&channelPhoneNumber=${channelPhoneNumber}`;
    }

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 200) {
      return response.data;
    }

    return { error: `Watti API returned status ${response.status}` };
  } catch (error) {
    const errorMsg = error.response?.data?.message || error.response?.data || error.message;
    console.error("Error fetching Watti templates:", errorMsg);
    return { error: errorMsg };
  }
};

module.exports = { sendWattiTemplateMessage, getWattiTemplates, generatePromoCode };
