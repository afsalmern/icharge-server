const { getWattiTemplates, sendWattiTemplateMessage } = require("../../helpers/wattiHelper");
const { resolveWattiParameters, resolveWattiHeaderImage } = require("../../helpers/wattiMappingResolver");
const db = require("../../models");
const { Op } = require("sequelize");

const User = db.users;
const WattiTemplateConfig = db.watti_template_configs;

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
 * Retrieve saved config for a template
 */
const getTemplateConfig = async (req, res) => {
  try {
    const { templateName } = req.params;
    if (!templateName) {
      return res.status(400).json({
        status: false,
        message: "Template name is required",
      });
    }

    const config = await WattiTemplateConfig.findOne({
      where: { template_name: templateName }
    });

    return res.status(200).json({
      status: true,
      message: "Template configuration fetched successfully",
      data: config || null
    });
  } catch (error) {
    console.error("Error in getTemplateConfig controller:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Save / Update template configuration
 */
const saveTemplateConfig = async (req, res) => {
  try {
    const {
      template_name,
      broadcast_name,
      body_mappings
    } = req.body;

    if (!template_name) {
      return res.status(400).json({
        status: false,
        message: "Template name is required",
      });
    }

    const [config, created] = await WattiTemplateConfig.findOrCreate({
      where: { template_name },
      defaults: {
        broadcast_name: broadcast_name || "Watti Broadcast",
        body_mappings: body_mappings || {},
      }
    });

    if (!created) {
      await config.update({
        broadcast_name: broadcast_name !== undefined ? broadcast_name : config.broadcast_name,
        body_mappings: body_mappings !== undefined ? body_mappings : config.body_mappings,
      });
    }

    return res.status(200).json({
      status: true,
      message: created ? "Template configuration created successfully" : "Template configuration updated successfully",
      data: config
    });
  } catch (error) {
    console.error("Error in saveTemplateConfig controller:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Send a Watti broadcast message (integrated with dynamic configs)
 */
const sendWattiBroadcast = async (req, res) => {
  try {
    console.log("Watti Broadcast Request Body:", JSON.stringify(req.body, null, 2));
    const {
      template_name, templateName,
      broadcast_name, broadcastName,
      parameters, recipients,
      header_image_url
    } = req.body;

    const finalTemplateName = template_name || templateName;
    const finalBroadcastName = broadcast_name || broadcastName;

    // Convert string recipient to array if needed
    const finalRecipients = Array.isArray(recipients) ? recipients : (recipients ? [recipients] : []);

    if (!finalTemplateName || finalRecipients.length === 0) {
      return res.status(400).json({
        status: false,
        message: "Template name and recipients array are required",
      });
    }

    // Load any saved Watti template mapping configuration from database
    const templateConfig = await WattiTemplateConfig.findOne({
      where: { template_name: finalTemplateName }
    });

    const results = [];
    for (const rawNumber of finalRecipients) {
      // Standardize number (remove non-digits, prefix country code 91 if 10-digits)
      let number = rawNumber.replace(/\D/g, "");
      if (number.length === 10) number = "91" + number;

      let finalParameters = parameters || [];
      let finalHeaderImage = header_image_url || null;

      // Resolve parameters dynamically if mapping config is found in the database
      if (templateConfig) {
        // Try to fetch the user matching this number to build contextual data
        // const matchedUser = await User.findOne({
        //   where: {
        //     [Op.or]: [
        //       { phone_number: number },
        //       { mobile: number },
        //       { phone_number: rawNumber },
        //       { mobile: rawNumber }
        //     ]
        //   }
        // });

        const context = {
          user: { name: "Customer", mobile: number },
        };

        // If body mappings exist in config, resolve parameters dynamically
        if (templateConfig.body_mappings && Object.keys(templateConfig.body_mappings).length > 0) {

          console.log(templateConfig.body_mappings)
          console.log(context)

          finalParameters = resolveWattiParameters(templateConfig.body_mappings, context);

          console.log("finalParameters", finalParameters);

          // Exclude internal metadata parameters from payload
          finalParameters = finalParameters.filter(p => p.name !== "isDynamicHeader");

          // 1. Check if dynamic header is enabled
          if (templateConfig.body_mappings.isDynamicHeader === true) {
            // Fetch the latest image from watti_media table
            const latestMedia = await db.watti_media.findOne({
              order: [['created_at', 'DESC']]
            });

            if (latestMedia) {
              const imageUrl = latestMedia.file_url;

              // Find parameter matching image or url
              let imageParamName = Object.keys(templateConfig.body_mappings).find(
                key => key.toLowerCase().includes("image") || key.toLowerCase().includes("url")
              ) || "offer_image_url";

              // Clean dynamic parameter names
              const nameMatch = imageParamName.match(/\{\{(.*?)\}\}/);
              if (nameMatch && nameMatch[1]) {
                imageParamName = nameMatch[1];
              }

              // Update parameter values
              const existingIdx = finalParameters.findIndex(p => p.name === imageParamName);
              if (existingIdx > -1) {
                finalParameters[existingIdx].value = imageUrl;
              } else {
                finalParameters.push({ name: imageParamName, value: imageUrl });
              }
            }
          }
        }
      }

      console.log(`Sending to ${number} with parameters:`, JSON.stringify(finalParameters, null, 2));

      const success = await sendWattiTemplateMessage(
        number,
        finalTemplateName,
        finalBroadcastName || (templateConfig && templateConfig.broadcast_name ? templateConfig.broadcast_name : "Promotion"),
        finalParameters
      );
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
      error: error.message
    });
  }
};

/**
 * Test sending a template using saved configuration mapping (Postman/Testing endpoint)
 */
const testSendTemplate = async (req, res) => {
  try {
    const { template_name, phone_number } = req.body;

    if (!template_name || !phone_number) {
      return res.status(400).json({
        status: false,
        message: "template_name and phone_number are required in request body",
      });
    }

    // 1. Fetch saved configuration
    const templateConfig = await WattiTemplateConfig.findOne({
      where: { template_name }
    });

    if (!templateConfig) {
      return res.status(404).json({
        status: false,
        message: `No saved configuration mapping found for template: ${template_name}. Please configure it in the admin panel first.`,
      });
    }

    // Standardize phone number
    let number = phone_number.replace(/\D/g, "");
    if (number.length === 10) number = "91" + number;

    // 2. Fetch matched user context (if any)
    const matchedUser = await User.findOne({
      where: {
        [Op.or]: [
          { phone_number: number },
          { mobile: number },
          { phone_number: phone_number },
          { mobile: phone_number }
        ]
      }
    });

    const context = {
      user: matchedUser || { name: "Test Customer", mobile: number }
    };

    // 3. Resolve parameters & dynamic media header
    let resolvedParameters = [];
    if (templateConfig.body_mappings) {
      resolvedParameters = resolveWattiParameters(templateConfig.body_mappings, context);

      // Exclude internal metadata parameters from payload
      resolvedParameters = resolvedParameters.filter(p => p.name !== "isDynamicHeader");

      // Check if dynamic header is enabled
      if (templateConfig.body_mappings.isDynamicHeader === true) {
        // Fetch the latest image from watti_media table
        const latestMedia = await db.watti_media.findOne({
          order: [['created_at', 'DESC']]
        });

        if (latestMedia) {
          const imageUrl = latestMedia.file_url;

          // Find parameter matching image or url
          let imageParamName = Object.keys(templateConfig.body_mappings).find(
            key => key.toLowerCase().includes("image") || key.toLowerCase().includes("url")
          ) || "offer_image_url";

          // Clean dynamic parameter names
          const nameMatch = imageParamName.match(/\{\{(.*?)\}\}/);
          if (nameMatch && nameMatch[1]) {
            imageParamName = nameMatch[1];
          }

          // Update parameter values
          const existingIdx = resolvedParameters.findIndex(p => p.name === imageParamName);
          if (existingIdx > -1) {
            resolvedParameters[existingIdx].value = imageUrl;
          } else {
            resolvedParameters.push({ name: imageParamName, value: imageUrl });
          }
        }
      }
    }

    console.log(`[Postman Test Send] Sending to ${number} with parameters:`, resolvedParameters);

    // 4. Trigger Watti sending
    const success = await sendWattiTemplateMessage(
      number,
      template_name,
      "Postman Test Broadcast",
      resolvedParameters
    );

    return res.status(200).json({
      status: true,
      message: success ? "Message sent successfully!" : "Failed to send message via Watti API.",
      debug: {
        recipient_phone: number,
        template_name: template_name,
        user_context_found: !!matchedUser,
        resolved_parameters: resolvedParameters,
        resolved_header_image: null,
        watti_response_success: success
      }
    });

  } catch (error) {
    console.error("Error in testSendTemplate controller:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Handle custom file uploads for WhatsApp template broadcast headers (Postman/Web UI)
 */
const uploadMediaFile = async (req, res) => {
  try {
    if (!req.files || !req.files.image) {
      return res.status(400).json({
        status: false,
        message: "No image file provided in request. Please upload it in the 'image' field."
      });
    }

    const file = req.files.image[0];
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5500}`;
    const fileUrl = `${baseUrl}uploads/${file.filename}`;

    return res.status(200).json({
      status: true,
      message: "Media uploaded successfully",
      url: fileUrl
    });
  } catch (error) {
    console.error("Error in uploadMediaFile controller:", error);
    return res.status(500).json({
      status: false,
      message: "Media upload failed",
      error: error.message
    });
  }
};

/**
 * Fetch all saved Watti media files
 */
const listWattiMedia = async (req, res) => {
  try {
    const media = await db.watti_media.findAll({
      order: [["created_at", "DESC"]]
    });
    return res.status(200).json({
      status: true,
      message: "Watti media fetched successfully",
      data: media
    });
  } catch (error) {
    console.error("Error in listWattiMedia controller:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Upload and save new Watti media record
 */
const addWattiMedia = async (req, res) => {
  try {
    if (!req.files || !req.files.image) {
      return res.status(400).json({
        status: false,
        message: "No image file provided in request. Please upload it in the 'image' field."
      });
    }

    const file = req.files.image[0];
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5500}`;
    const fileUrl = `${baseUrl}uploads/${file.filename}`;
    const title = req.body.title || file.originalname;

    const newMedia = await db.watti_media.create({
      title,
      file_path: file.filename,
      file_url: fileUrl
    });

    return res.status(200).json({
      status: true,
      message: "Media uploaded successfully",
      data: newMedia
    });
  } catch (error) {
    console.error("Error in addWattiMedia controller:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Update media record (supports renaming or replacing image)
 */
const updateWattiMedia = async (req, res) => {
  try {
    const { id } = req.params;
    const media = await db.watti_media.findByPk(id);
    if (!media) {
      return res.status(404).json({
        status: false,
        message: "Media not found"
      });
    }

    let updatedData = {};
    if (req.body.title !== undefined) {
      updatedData.title = req.body.title;
    }

    if (req.files && req.files.image) {
      // delete old file if it exists
      const fs = require("fs");
      const path = require("path");
      const oldFilePath = path.join(__dirname, "../../uploads", media.file_path);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }

      const file = req.files.image[0];
      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5500}`;
      updatedData.file_path = file.filename;
      updatedData.file_url = `${baseUrl}/uploads/${file.filename}`;
    }

    await media.update(updatedData);

    return res.status(200).json({
      status: true,
      message: "Media updated successfully",
      data: media
    });
  } catch (error) {
    console.error("Error in updateWattiMedia controller:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Delete a media record and its file from server
 */
const deleteWattiMedia = async (req, res) => {
  try {
    const { id } = req.params;
    const media = await db.watti_media.findByPk(id);
    if (!media) {
      return res.status(404).json({
        status: false,
        message: "Media not found"
      });
    }

    // delete file from disk
    const fs = require("fs");
    const path = require("path");
    const filePath = path.join(__dirname, "../../uploads", media.file_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await media.destroy();

    return res.status(200).json({
      status: true,
      message: "Media deleted successfully"
    });
  } catch (error) {
    console.error("Error in deleteWattiMedia controller:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

module.exports = {
  listWattiTemplates,
  getTemplateConfig,
  saveTemplateConfig,
  sendWattiBroadcast,
  testSendTemplate,
  uploadMediaFile,
  listWattiMedia,
  addWattiMedia,
  updateWattiMedia,
  deleteWattiMedia,
};
