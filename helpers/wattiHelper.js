const axios = require("axios");
const db = require("../models");

const Users = db.users;
const WattiTemplateConfig = db.watti_template_configs;


const generatePromoCode = (phone) => {
  const last4 = phone.slice(-4);

  const uniquePart = Date.now().toString().slice(-3);

  return `ICHARGE${last4}${uniquePart}`;
};

const sendWattiTemplateMessage = async (whatsappNumber, templateName, broadcastName, parameters) => {
  try {

    // return true

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


const sendTemplateMessage = async ({
  phone_number,
  transaction,
}) => {
  try {

    if (!phone_number) {
      throw new Error("phone_number is required");
    }


    const user = await Users.findOne({
      attributes: ["id", "name", "mobile"],
      where: { mobile: phone_number },
      transaction,
    });

    if (!user) {
      throw new Error("User not found");
    }

    const templateConfig = await WattiTemplateConfig.findOne({
      where: { status: true },
      transaction,
    });

    if (!templateConfig) {
      throw new Error("Template config not found");
    }

    // =========================
    // VALIDATE BODY MAPPINGS
    // =========================

    if (
      !templateConfig.body_mappings ||
      Object.keys(templateConfig.body_mappings).length === 0
    ) {
      throw new Error("Template mappings not found");
    }

    // =========================
    // FORMAT PHONE NUMBER
    // =========================

    let number = phone_number.replace(/\D/g, "");

    if (!number.startsWith("91")) {
      number = "91" + number;
    }

    // =========================
    // RESOLVE PARAMETERS
    // =========================

    let finalParameters = resolveWattiParameters(
      templateConfig.body_mappings
    );

    // Remove helper field
    finalParameters = finalParameters.filter(
      (p) => p.name !== "isDynamicHeader"
    );

    // =========================
    // USER NAME PARAM
    // =========================

    const nameParamName =
      templateConstants?.name || "user_name";

    setParameter(
      finalParameters,
      nameParamName,
      user.name || "Customer"
    );

    const promoCode = generatePromoCode(number);

    setParameter(
      finalParameters,
      "promo_code",
      promoCode
    );

    await db.promo_codes.create({
      user_id: user.id,
      phone_number: number,
      promo_code: promoCode,
      template_name: templateConfig.template_name,
    }, { transaction });


    // =========================
    // DYNAMIC IMAGE HEADER
    // =========================

    if (templateConfig.body_mappings.isDynamicHeader === true) {

      const latestMedia = await db.watti_media.findOne({
        order: [["created_at", "DESC"]],
        transaction,
      });

      if (!latestMedia) {
        throw new Error(
          "Template requires a dynamic image but no media found"
        );
      }

      const imageUrl = latestMedia.file_url;

      const imageParamName =
        templateConstants?.image || "image_url";

      setParameter(
        finalParameters,
        imageParamName,
        imageUrl
      );
    }

    // =========================
    // LOG PARAMETERS
    // =========================

    console.log(
      `Sending template "${template_name}" to ${number}`
    );

    console.log(
      JSON.stringify(finalParameters, null, 2)
    );

    // =========================
    // SEND TEMPLATE
    // =========================

    const success = await sendWattiTemplateMessage(
      number,
      template_name,
      user.name,
      finalParameters
    );

    if (!success) {
      throw new Error("Failed to send template message");
    }

    // =========================
    // RETURN RESPONSE DATA
    // =========================

    return {
      success: true,
      phone_number: number,
      template_name,
      promo_code: promoCode,
      parameters: finalParameters,
      user,
    };

  } catch (error) {

    console.error(
      "Error in sendTemplateMessage:",
      error
    );

    throw error;
  }
};


module.exports = { sendWattiTemplateMessage, getWattiTemplates, generatePromoCode, sendTemplateMessage };
