const { Op } = require("sequelize");
const db = require("../../models");
const { sendSuccess } = require("../../handlers/success_response_handler");
const { ApiError } = require("../../middlewares/error");

const PowerBanks = db.powerbanks;
const Boxes = db.boxes;

// Get All Powerbanks (with optional filters)
exports.getAllPowerBanks = async (req, res, next) => {
  // unique_id is powerNo
  try {
    const { status = "all", keyword } = req.query;
    const whereClause = {
      ...(status !== "all" ? { status } : {}),
      ...(keyword
        ? {
            [Op.or]: [{ unique_id: { [Op.iLike]: `%${keyword}%` } }],
          }
        : {}),
    };

    const powerbanks = await PowerBanks.findAll({
      where: whereClause,
      include: [{ model: Boxes, as: "box", attributes: ["id", "unique_id", "device_id"] }],
      order: [["created_at", "DESC"]],
    });

    sendSuccess(res, "Powerbanks fetched successfully", { powerbanks }, 200);
  } catch (error) {
    console.error(error);
    next(error);
  }
};

// Create PowerBank
exports.addPowerBank = async (req, res, next) => {
  try {
    const { box_id, unique_id, status, battery_level, health_status, slot_number, last_back_time } = req.body;

    const powerbank = await PowerBanks.create({
      box_id,
      unique_id,
      status,
      battery_level,
      health_status,
      slot_number,
      last_back_time,
      last_synced_at: new Date(),
    });

    sendSuccess(res, "PowerBank added successfully", { powerbank }, 200);
  } catch (error) {
    console.error(error);
    next(error);
  }
};

// Update PowerBank
exports.updatePowerBank = async (req, res, next) => {
  const { id } = req.params;
  try {
    const powerbank = await PowerBanks.findByPk(id);
    if (!powerbank) throw new ApiError(404, "Powerbank not found");

    const updated = await powerbank.update({
      ...req.body,
      last_synced_at: new Date(),
    });

    sendSuccess(res, "PowerBank updated successfully", { updated }, 200);
  } catch (error) {
    console.error(error);
    next(error);
  }
};

// Delete PowerBank
exports.deletePowerBank = async (req, res, next) => {
  const { id } = req.params;
  try {
    const powerbank = await PowerBanks.findByPk(id);
    if (!powerbank) throw new ApiError(404, "Powerbank not found");

    await powerbank.destroy();
    sendSuccess(res, "PowerBank deleted successfully", {}, 200);
  } catch (error) {
    console.error(error);
    next(error);
  }
};
