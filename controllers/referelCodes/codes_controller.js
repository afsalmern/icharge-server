const { sendSuccess } = require("../../handlers/success_response_handler");
const { createReferelCode, updateReferelCode } = require("../../helpers/referelCodeHelper");

exports.createReferelCode = async (req, res, next) => {
  const { reference_id: entity_id, type: entity_type, code } = req.body;
  try {
    await createReferelCode(entity_id, entity_type, code);
    sendSuccess(res, "Referel code created successfully", {}, 200);
  } catch (error) {
    next(error);
  }
};

exports.updateReferelCode = async (req, res, next) => {
  const { id } = req.params;
  try {
    await updateReferelCode(req.body, id);
    sendSuccess(res, "Referel code updated successfully", {}, 200);
  } catch (error) {
    next(error);
  }
};
