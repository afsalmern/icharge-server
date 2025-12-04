const { Op } = require("sequelize");
const { ApiError } = require("../middlewares/error");
const db = require("../models");

const ReferelCodes = db.referel_codes;
const UserReferels = db.user_referels;

const createReferelCode = async (entity_id, entity_type, code, transaction) => {
  console.log("Creating referral code for", entity_id, entity_type, code);

  try {
    const modelMap = {
      corporate: db.corporates,
      location: db.locations,
    };

    const model = modelMap[entity_type];
    if (!model) throw new ApiError(400, "Invalid entity type");

    const entity = await model.findByPk(entity_id, { transaction });
    if (!entity) throw new ApiError(400, `${entity_type} does not exist`);

    const existingCode = await ReferelCodes.findOne({
      where: { code },
      transaction,
    });
    if (existingCode) throw new ApiError(400, "Referral code already exists");

    await ReferelCodes.create(
      {
        reference_id: entity_id,
        type: entity_type,
        code,
        is_active: true,
        is_valid: true,
      },
      { transaction }
    );

    return true;
  } catch (error) {
    console.error("Error creating referral code:", error);
    throw error;
  }
};

const updateReferelCode = async (body, id) => {
  const { referel_code: code, type, is_valid, is_active } = body;
  const transaction = await db.sequelize.transaction();

  try {
    // Fetch the existing record
    const referelCode = await ReferelCodes.findByPk(id);
    if (!referelCode) {
      throw new ApiError(400, "Referral code does not exist");
    }

    // Validate entity type
    const modelMap = {
      corporate: db.corporates,
      location: db.locations,
    };
    const model = modelMap[type];
    if (!model) throw new ApiError(400, "Invalid referral type");

    // Check for duplicate referral code
    const existingCode = await ReferelCodes.findOne({
      where: {
        code: code,
        id: { [Op.ne]: id },
      },
    });

    if (existingCode) {
      throw new ApiError(400, "Referral code already exists for this entity");
    }

    // Update record
    await referelCode.update(
      {
        code,
        is_active,
        is_valid,
      },
      { transaction }
    );

    await transaction.commit();
    return true;
  } catch (error) {
    await transaction.rollback();
    console.error("Error updating referral code:", error);
    throw error;
  }
};

const getAndUpdateReferelCode = async (entity_id, entity_type, code, transaction) => {
  try {
    const referelCode = await ReferelCodes.findOne({
      where: {
        reference_id: entity_id,
        type: entity_type,
      },
      transaction,
    });

    if (!referelCode) {
      await ReferelCodes.create(
        {
          reference_id: entity_id,
          type: entity_type,
          code,
          is_active: true,
          is_valid: true,
        },
        { transaction }
      );
      return true;
    }

    await referelCode.update({
      code,
    });
    return true;
  } catch (error) {
    console.error("Error fetching referral code:", error);
    throw error;
  }
};

const deleteReferelCode = async (entity_id, entity_type, transaction) => {
  try {
    const referelCode = await ReferelCodes.findOne({
      where: {
        reference_id: entity_id,
        type: entity_type,
      },
      transaction,
    });

    if (!referelCode) {
      throw new ApiError(400, "Referral code does not exist");
    }

    await referelCode.destroy({ transaction });
    return true;
  } catch (error) {
    console.error("Error deleting referral code:", error);
    throw error;
  }
};

const addUserReferelCode = async (user_id, code) => {
  try {
    const referelCode = await ReferelCodes.findOne({
      where: {
        code,
      },
    });

    if (!referelCode) {
      throw new ApiError(400, "Invalid referral code");
    }

    await UserReferels.create({ user_id, referel_id: referelCode.id });
    return true;
  } catch (error) {
    console.error("Error updating referral code:", error);
    throw error;
  }
};

module.exports = {
  createReferelCode,
  updateReferelCode,
  addUserReferelCode,
  deleteReferelCode,
  getAndUpdateReferelCode,
};
