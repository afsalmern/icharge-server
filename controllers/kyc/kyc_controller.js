const { Op } = require("sequelize");
const { sendSuccess } = require("../../handlers/success_response_handler");
const deleteFile = require("../../helpers/deleteFiles");
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
      where: {
        [Op.or]: [{ status: "pending" }, { status: "verified" }],
      },
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
  const { kyc_id = null, full_name, proof_type, proof_number } = req.body;

  const proof_front = (req.files && req.files?.["proof_front"]?.[0]?.filename) || null;
  const proof_back = (req.files && req.files?.["proof_back"]?.[0]?.filename) || null;
  const photo = (req.files && req.files?.["photo"]?.[0]?.filename) || null;

  try {
    const user = await Users.findByPk(user_id);
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    if (!kyc_id) {
      const existingKyc = await KycDetails.findOne({
        where: {
          proof_number,
        },
      });

      if (existingKyc && existingKyc.proof_number == proof_number) {
        throw new ApiError(409, "Item with this proof number already exists");
      }

      const kyc = await KycDetails.create({
        full_name,
        proof_type,
        proof_number,
        proof_front,
        proof_back,
        photo,
        user_id,
        submitted_at: new Date(),
        verified_at: null,
      });
      await Users.update({ user_preferred_method: "kyc" }, { where: { id: user_id } });
      return sendSuccess(res, "Kyc details updated successfully", { kyc }, 200);
    } else {
      const currentKyc = await KycDetails.findByPk(kyc_id);
      if (!currentKyc) {
        throw new ApiError(400, "Kyc data not found");
      }

      const updatedKyc = await currentKyc.update(
        {
          full_name,
          proof_type,
          proof_number,
          proof_front: proof_front ? proof_front : currentKyc.proof_front,
          proof_back: proof_back ? proof_back : currentKyc.proof_back,
          photo: photo ? photo : currentKyc.photo,
          user_id,
          reject_remarks: null,
          status: "pending",
          submitted_at: new Date(),
          verified_at: null,
        },
        {
          returning: true,
        }
      );

      if (updatedKyc) {
        if (proof_front) await deleteFile(`uploads/${currentKyc.proof_front}`);
        if (proof_back) await deleteFile(`uploads/${currentKyc.proof_back}`);
        if (photo) await deleteFile(`uploads/${currentKyc.photo}`);
        await Users.update({ user_preferred_method: "kyc" }, { where: { id: user_id } });
        return sendSuccess(res, "Kyc details updated successfully", { kyc: updatedKyc }, 200);
      }
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.updateKyc = async (req, res, next) => {
  try {
    const { kyc_id, full_name, proof_type, proof_number } = req.body;

    const proof_front = (req.files && req.files?.["proof_front"]?.[0]?.filename) || null;
    const proof_back = (req.files && req.files?.["proof_back"]?.[0]?.filename) || null;
    const photo = (req.files && req.files?.["photo"]?.[0]?.filename) || null;

    const existingKyc = await KycDetails.findByPk(kyc_id);

    if (!existingKyc) {
      throw new ApiError(404, "Kyc details not found");
    }

    const oldProofFront = existingKyc.proof_front;
    const oldProofBack = existingKyc.proof_back;
    const oldPhoto = existingKyc.photo;

    const kyc = await existingKyc.update({
      full_name,
      proof_type,
      proof_number,
      proof_front: proof_front ? proof_front : existingKyc.proof_front,
      proof_back: proof_back ? proof_back : existingKyc.proof_back,
      photo: photo ? photo : existingKyc.photo,
      reject_remarks: null,
      status: "pending",
    });

    if (proof_back) await deleteFile(`uploads/${oldProofBack}`);
    if (proof_front) await deleteFile(`uploads/${oldProofFront}`);
    if (photo) await deleteFile(`uploads/${oldPhoto}`);

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

exports.updateKycStatus = async (req, res, next) => {
  const { id } = req.params;
  const { type, reject_remarks = null } = req.body;

  const allowedTypes = ["rejected", "verified"];

  const transaction = await db.sequelize.transaction();
  try {
    if (type == "rejected" && (!reject_remarks || reject_remarks == "")) {
      throw new ApiError(400, "Please enter reject remarks");
    }
    if (!allowedTypes.includes(type)) {
      throw new ApiError(400, "Please choose valid status to update kyc");
    }

    const kyc = await KycDetails.findByPk(id);
    if (!kyc) {
      throw new ApiError(400, "Kyc data not found");
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

    if (type == "verified") {
      const user = await Users.findByPk(kyc.user_id);
      await user.update({ is_verified: true });
    }

    await transaction.commit();
    sendSuccess(res, "Kyc updated successfully", { kyc: updatedKyc }, 200);
  } catch (error) {
    console.log(error);
    console.log("reached here");
    if (transaction) await transaction.rollback();
    next(error);
  }
};
