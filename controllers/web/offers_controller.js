const db = require("../../models");
const { sendSuccess } = require("../../handlers/success_response_handler");
const { ApiError } = require("../../middlewares/error");

const Offers = db.offers;

exports.getOffers = async (req, res, next) => {
  try {
    const offers = await Offers.findAll({
      attributes: ["id", "description", "order", "status", "created_at", "updated_at"],
      order: [
        ["order", "ASC"],
        ["created_at", "DESC"]
      ],
    });
    sendSuccess(res, "Offers fetched successfully", { offers }, 200);
  } catch (error) {
    console.error(error);
    next(error);
  }
};

exports.addOffer = async (req, res, next) => {
  const { description, order, status } = req.body;
  try {
    const offer = await Offers.create({
      description,
      order: order ? parseInt(order, 10) : 0,
      status: status || "active",
    });
    sendSuccess(res, "Offer added successfully", { offer }, 200);
  } catch (error) {
    console.error(error);
    next(error);
  }
};

exports.updateOffer = async (req, res, next) => {
  const { id } = req.params;
  const { description, order, status } = req.body;
  try {
    const offer = await Offers.findByPk(id);
    if (!offer) {
      throw new ApiError(404, "Offer not found");
    }
    const updatedOffer = await offer.update({
      description: description !== undefined ? description : offer.description,
      order: order !== undefined ? parseInt(order, 10) : offer.order,
      status: status !== undefined ? status : offer.status,
    });
    sendSuccess(res, "Offer updated successfully", { updatedOffer }, 200);
  } catch (error) {
    console.error(error);
    next(error);
  }
};

exports.deleteOffer = async (req, res, next) => {
  const { id } = req.params;
  try {
    const offer = await Offers.findByPk(id);
    if (!offer) {
      throw new ApiError(404, "Offer not found");
    }
    await offer.destroy();
    sendSuccess(res, "Offer deleted successfully", {}, 200);
  } catch (error) {
    console.error(error);
    next(error);
  }
};
