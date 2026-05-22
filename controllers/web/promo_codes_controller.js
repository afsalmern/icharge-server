const { promo_codes } = require("../../models");
const logError = require("../../helpers/logger");

/**
 * Get all promo codes
 */
const getPromoCodes = async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) {
      where.status = status;
    }

    const data = await promo_codes.findAll({
      where,
      order: [["created_at", "DESC"]],
    });
    return res.status(200).json({
      status: true,
      message: "Promo codes fetched successfully",
      data: data,
    });
  } catch (error) {
    console.error("Error fetching promo codes:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

/**
 * Add a new promo code
 */
const addPromoCode = async (req, res) => {
  try {
    const {
      code,
      discount_type,
      discount_value,
      valid_from,
      valid_until,
      status,
      max_usage,
      send_whatsapp,
      applies_to,
      watti_template_name,
    } = req.body;

    const existingCode = await promo_codes.findOne({ where: { code } });
    if (existingCode) {
      return res.status(400).json({
        status: false,
        message: "Promo code already exists",
      });
    }

    const newCode = await promo_codes.create({
      code,
      discount_type,
      discount_value,
      valid_from: valid_from || null,
      valid_until: valid_until || null,
      status: status || "active",
      max_usage: max_usage || null,
      usage_count: 0,
      send_whatsapp: send_whatsapp || false,
      applies_to: applies_to || null,
      watti_template_name: watti_template_name || null,
    });

    return res.status(201).json({
      status: true,
      message: "Promo code added successfully",
      data: newCode,
    });
  } catch (error) {
    console.error("Error adding promo code:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

/**
 * Update a promo code
 */
const updatePromoCode = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code,
      discount_type,
      discount_value,
      valid_from,
      valid_until,
      status,
      max_usage,
      send_whatsapp,
      applies_to,
      watti_template_name,
    } = req.body;

    const promoCode = await promo_codes.findByPk(id);
    if (!promoCode) {
      return res.status(404).json({
        status: false,
        message: "Promo code not found",
      });
    }

    // Check if new code is already taken by another entry
    if (code && code !== promoCode.code) {
      const existingCode = await promo_codes.findOne({ where: { code } });
      if (existingCode) {
        return res.status(400).json({
          status: false,
          message: "Promo code already exists",
        });
      }
    }

    await promoCode.update({
      code: code || promoCode.code,
      discount_type: discount_type || promoCode.discount_type,
      discount_value: discount_value || promoCode.discount_value,
      valid_from: valid_from === undefined ? promoCode.valid_from : (valid_from || null),
      valid_until: valid_until === undefined ? promoCode.valid_until : (valid_until || null),
      status: status || promoCode.status,
      max_usage: max_usage === undefined ? promoCode.max_usage : (max_usage || null),
      send_whatsapp: send_whatsapp !== undefined ? send_whatsapp : promoCode.send_whatsapp,
      applies_to: applies_to === undefined ? promoCode.applies_to : (applies_to || null),
      watti_template_name: watti_template_name === undefined ? promoCode.watti_template_name : (watti_template_name || null),
    });

    return res.status(200).json({
      status: true,
      message: "Promo code updated successfully",
      data: promoCode,
    });
  } catch (error) {
    logError(error);
    console.error("Error updating promo code:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Delete a promo code (Soft delete due to paranoid: true)
 */
const deletePromoCode = async (req, res) => {
  try {
    const { id } = req.params;
    const promoCode = await promo_codes.findByPk(id);
    if (!promoCode) {
      return res.status(404).json({
        status: false,
        message: "Promo code not found",
      });
    }

    await promoCode.destroy();

    return res.status(200).json({
      status: true,
      message: "Promo code deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting promo code:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  getPromoCodes,
  addPromoCode,
  updatePromoCode,
  deletePromoCode,
};
