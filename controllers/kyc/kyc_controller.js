const { sendSuccess } = require("../../handlers/success_response_handler");
const { ApiError } = require("../../middlewares/error");
const db = require("../../models");
const KycDetails = db.kyc_details;
const Users = db.users;
exports.getKycDatas = async (req, res, next) => {
  try {
    const kycs = await KycDetails.findAll({
      attributes: [
        "id",
        "user_id",
        "full_name",
        "photo",
        "proof_type",
        "proof_number",
        "proof_front",
        "status",
        "reject_remarks",
        "submitted_at",
        "verified_at",
        "created_at",
        "updated_at",
        "proof_back",
      ],
      include: [
        {
          model: Users,
          as: "user",
          attributes: ["id", "name", "mobile"],
        },
      ],
    });

    sendSuccess(res, "Kyc details fetched successfully", { kycs }, 200);
  } catch (error) {
    console.log("error in getting kyc details");
    next(error);
  }
};

exports.uploadKyc = async (req, res, next) => {
  const { user_id } = req;
  const { full_name, proof_type, proof_number } = req.body;

  const proof_front = (req.files && req.files?.["proof_front"]?.[0]?.filename) || null;
  const proof_back = (req.files && req.files?.["proof_back"]?.[0]?.filename) || null;
  const photo = (req.files && req.files?.["photo"]?.[0]?.filename) || null;

  try {
    const user = await Users.findByPk(user_id);
    const existingKyc = await KycDetails.findOne({
      where: {
        proof_number,
      },
    });

    if (existingKyc && existingKyc.proof_number == proof_number) {
      throw new ApiError(409, "Item with this proof number already exists");
    }
    const kyc = await user?.createKyc_details({
      full_name,
      proof_type,
      proof_number,
      proof_front,
      proof_back,
      photo,
      submitted_at: new Date(),
      verified_at: null,
    });

    sendSuccess(res, "Kyc details updated successfully", { kyc }, 200);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.getUserKycDetails = async (req, res, next) => {
  try {
    const { user_id } = req;
    const user = await Users.findByPk(user_id);
    const kyc_data = await user?.getKyc_details();
    sendSuccess(res, "Kyc details fetched successfully", { kyc_data }, 200);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.updateKyc = async (req, res, next) => {
  const { id } = req.params;
  const { type, reject_remarks = null } = req.body;

  const allowedTypes = ["rejected", "verified"];

  const transaction = await db.sequelize.transaction();
  try {
    if (type == "rejected" && (!reject_remarks || reject_remarks == "")) {
      throw new ApiError(500, "Please enter reject remarks");
    }
    if (!allowedTypes.includes(type)) {
      throw new ApiError(500, "Please choose valid status to update kyc");
    }

    const kyc = await KycDetails.findByPk(id);
    if (!kyc) {
      throw new ApiError(500, "Kyc data not found");
    }

    const updatedKyc = await kyc.update(
      {
        verified_at: new Date(),
        status: type,
        reject_remarks: type == "verified" ? null : reject_remarks,
      },
      {
        returning: true,
      }
    );
    await transaction.commit();
    sendSuccess(res, "Kyc updated successfully", { kyc: updatedKyc }, 200);
  } catch (error) {
    console.log(error);
    console.log("reached here");
    if (transaction) await transaction.rollback();
    next(error);
  }
};
