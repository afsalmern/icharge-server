const express = require("express");
const router = express.Router();
const promoCodeController = require("../../controllers/web/promo_codes_controller");
const { verifyToken } = require("../../middlewares/auth");
const { checkRole } = require("../../middlewares/role_check");
const {
  validatePromoCode,
  validatePromoCodeUpdate,
  validate,
} = require("../../validators/validators");

// Promo Codes Routes
router.get("/", verifyToken, checkRole("admin"), promoCodeController.getPromoCodes);
router.post("/", verifyToken, checkRole("admin"), validatePromoCode, validate, promoCodeController.addPromoCode);
router.patch("/:id", verifyToken, checkRole("admin"), validatePromoCodeUpdate, validate, promoCodeController.updatePromoCode);
router.delete("/:id", verifyToken, checkRole("admin"), promoCodeController.deletePromoCode);

module.exports = router;
