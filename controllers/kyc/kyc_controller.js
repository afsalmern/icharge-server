const { sendSuccess } = require("../../handlers/success_response_handler");
const db = require("../../models");
const KycDetails = db.kyc_details;
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
        "submitted_at",
        "verified_at",
        "created_at",
        "updated_at",
        "proof_back",
      ],
    });

    sendSuccess(res, "Kyc details fetched successfully", { kycs }, 200);
  } catch (error) {
    console.log("error in getting kyc details");
    next(error);
  }
};
