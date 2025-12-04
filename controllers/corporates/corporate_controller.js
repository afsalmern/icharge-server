const { ref } = require("pdfkit");
const { sendSuccess } = require("../../handlers/success_response_handler");
const { ApiError } = require("../../middlewares/error");
const db = require("../../models");
const { Op } = require("sequelize");
const { getAndUpdateReferelCode, deleteReferelCode, createReferelCode } = require("../../helpers/referelCodeHelper");
const Corporates = db.corporates;
const ReferelCodes = db.referel_codes;

exports.addCorporates = async (req, res, next) => {
  const { name, email, phone, is_active, address, code } = req.body;
  const transaction = await db.sequelize.transaction();

  try {
    // Duplicate email check
    const emailExists = await Corporates.findOne({ where: { email } });
    if (emailExists) {
      throw new ApiError(400, "Email already exists");
    }

    // Duplicate phone check
    if (phone) {
      console.log("Checking phone:", phone);
      const phoneExists = await Corporates.findOne({ where: { phone } });
      if (phoneExists) {
        console.log("Checking phone:", phoneExists);
        throw new ApiError(400, "Phone already exists");
      }
    }

    const data = await Corporates.create(
      {
        name,
        phone,
        email,
        is_active,
        address,
      },
      { transaction }
    );

    const corporateId = data.id;
    await createReferelCode(corporateId, "corporate", code, transaction);

    await transaction.commit();
    res.status(200).json({ message: "Corporates added successfully", data });
  } catch (error) {
    console.error(error);
    await transaction.rollback();
    next(error);
  }
};

exports.updateCorporate = async (req, res, next) => {
  const { name, email, is_active, phone, address, code } = req.body;
  const { id } = req.params;

  const corporate = await Corporates.findByPk(id);
  if (!corporate) {
    throw new ApiError(404, "Corporates not found");
  }

  const transaction = await db.sequelize.transaction();

  try {
    // Duplicate email check (exclude current ID)
    if (email) {
      const emailExists = await Corporates.findOne({
        where: {
          email,
          id: { [Op.ne]: id },
        },
      });

      if (emailExists) {
        throw new ApiError(400, "Email already exists");
      }
    }

    // Duplicate phone check (exclude current ID)
    if (phone) {
      const phoneExists = await Corporates.findOne({
        where: {
          phone,
          id: { [Op.ne]: id },
        },
      });

      if (phoneExists) {
        throw new ApiError(400, "Phone already exists");
      }
    }

    const data = await corporate.update(
      {
        name: name || corporate.name,
        email: email || corporate.email,
        is_active,
        phone: phone || corporate.phone,
        address: address || corporate.address,
      },
      { transaction } // corrected: update options must be a single object
    );

    if (code) {
      await getAndUpdateReferelCode(id, "corporate", code, transaction);
    } else {
      await deleteReferelCode(id, "corporate", transaction);
    }

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
      attributes: ["id", "name", "email", "is_active", "phone", "address"],
    });
    const corporateCodes = await ReferelCodes.findAll({
      attributes: ["id", "code", "type", "reference_id", "is_valid", "is_active"],
      where: {
        type: "corporate",
      },
    });

    const modifiedData = data.map((corporate) => {
      const code = corporateCodes.find((code) => code.reference_id == corporate.id);
      const referralCode = code ? code?.code : null;
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
  const transaction = await db.sequelize.transaction();
  try {
    const corporate = await Corporates.findByPk(id);
    if (!corporate) {
      throw new ApiError(404, "Corporates not found");
    }
    await deleteReferelCode(id, "corporate", transaction);
    await corporate.destroy();
    await transaction.commit();

    sendSuccess(res, "Corporates deleted successfully", {}, 200);
  } catch (error) {
    console.error(error);
    await transaction.rollback();
    next(error);
  }
};
