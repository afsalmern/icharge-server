const express = require("express");
const { addLocation, getLocations } = require("../../controllers/locations/locations_controller");
const { verifyToken } = require("../../middlewares/auth");
const { checkRole } = require("../../middlewares/role_check");
const { locationDataValidation, validate, validateId } = require("../../validators/validators");
const { getAllUsers, blockOrUnblockUser, activeOrInactiveUser } = require("../../controllers/web/web_controller");
const router = express.Router();

//Locations
router.post("/locations", verifyToken, locationDataValidation, validate, addLocation);
router.get("/locations", verifyToken, getLocations);

//Terms and conditions
router.post("/terms-conditions", verifyToken, addLocation);
router.get("/terms-conditions", verifyToken, getLocations);

//Users
router.get("/users", verifyToken, checkRole("admin"), getAllUsers);
router.patch("/users/:id", verifyToken, checkRole("admin"), validateId, validate, blockOrUnblockUser);
router.patch("/user-status/:id", verifyToken, checkRole("admin"), validateId, validate, activeOrInactiveUser);

module.exports = router;
