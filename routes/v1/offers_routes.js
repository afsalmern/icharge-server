const express = require("express");
const router = express.Router();
const offersController = require("../../controllers/web/offers_controller");
const { verifyToken } = require("../../middlewares/auth");
const { checkRole } = require("../../middlewares/role_check");
const {
  validateOffer,
  validateOfferUpdate,
  validate,
} = require("../../validators/validators");

// Offers Routes
router.get("/", verifyToken, checkRole("admin"), offersController.getOffers);
router.post("/", verifyToken, checkRole("admin"), validateOffer, validate, offersController.addOffer);
router.patch("/:id", verifyToken, checkRole("admin"), validateOfferUpdate, validate, offersController.updateOffer);
router.delete("/:id", verifyToken, checkRole("admin"), offersController.deleteOffer);

module.exports = router;
