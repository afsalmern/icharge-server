const { ref } = require("pdfkit");
const { sendSuccess } = require("../../handlers/success_response_handler");
const { ApiError } = require("../../middlewares/error");
const db = require("../../models");
const Corporates = db.corporates;
const ReferelCodes = db.referel_codes;

exports.addCorporates = async (req, res, next) => {
  const { name, email, phone, is_active } = req.body;
  const transaction = await db.sequelize.transaction();
  try {
    const data = await Corporates.create(
      {
        name,
        phone,
        email,
        is_active,
      },
      { transaction }
    );

    await transaction.commit();

    res.status(200).json({ message: "Corporates added successfully", data });
  } catch (error) {
    console.error(error);
    await transaction.rollback();
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.updateCorporate = async (req, res, next) => {
  const { name, email, is_active, phone } = req.body;
  const { id } = req.params;

  const corporate = await Corporates.findByPk(id);
  if (!corporate) {
    throw new ApiError(404, "Corporates not found");
  }

  const transaction = await db.sequelize.transaction();
  try {
    const data = await corporate.update(
      {
        name: name || corporate.name,
        email: email || corporate.email,
        is_active,
        phone: phone || corporate.phone,
      },
      { returning: true },
      { transaction }
    );

    await transaction.commit();
    sendSuccess(res, "Corporates updated successfully", { corporate: data }, 200);
  } catch (error) {
    console.error(error);
    await transaction.rollback();
    next(error);
  }
};

exports.getCorporates = async (req, res) => {
  try {
    const data = await Corporates.findAll({
      attributes: ["id", "name", "email", "is_active", "phone"],
    });
    const corporateCodes = await ReferelCodes.findAll({
      attributes: ["id", "code", "type", "reference_id", "is_valid", "is_active"],
      where: {
        type: "corporate",
      },
    });

    const modifiedData = data.map((corporate) => {
      const code = corporateCodes.find((code) => code.reference_id == corporate.id);
      const referralCode = code
        ? {
            id: code.id,
            code: code.code,
            is_valid: code.is_valid,
            is_active: code.is_active,
          }
        : null;
      return {
        ...corporate.dataValues,
        referral_code: referralCode,
      };
    });

    return res.status(200).json({ message: "Corporates fetched successfully", data: modifiedData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.deleteCorporate = async (req, res, next) => {
  const { id } = req.params;
  const corporate = await Corporates.findByPk(id);
  if (!corporate) {
    throw new ApiError(404, "Corporates not found");
  }
  try {
    await corporate.destroy();
    sendSuccess(res, "Corporates deleted successfully", {}, 200);
  } catch (error) {
    console.error(error);
    next(error);
  }
};
