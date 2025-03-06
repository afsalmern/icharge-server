const express = require("express");
const { addLocation, getLocations, updateLocation, deleteLocation } = require("../../controllers/locations/locations_controller");
const { verifyToken } = require("../../middlewares/auth");
const { checkRole } = require("../../middlewares/role_check");
const { locationDataValidation, validate, validateId, validatePackagesData, validateBoxesData } = require("../../validators/validators");
const {
  getAllUsers,
  blockOrUnblockUser,
  activeOrInactiveUser,
  addPackage,
  getPackages,
  deletePackage,
  updatePackage,
  getBoxes,
  addBoxes,
  getLocationWiseBoxes,
  getDropDownDatas,
  updateBox,
  deleteBoxes,
} = require("../../controllers/web/web_controller");
const upload = require("../../middlewares/multer");
const router = express.Router();

//DropDownData
router.get("/dropdowns", verifyToken, checkRole("admin"), getDropDownDatas);

//Locations
router.post("/locations", verifyToken, checkRole("admin"), locationDataValidation, validate, addLocation);
router.delete("/locations/:id", verifyToken, checkRole("admin"), deleteLocation);
router.patch("/locations/:id", verifyToken, checkRole("admin"), locationDataValidation, validate, updateLocation);
router.get("/locations", verifyToken, getLocations);

//Packages
router.get("/packages", verifyToken, checkRole("admin"), getPackages);
router.post("/packages", verifyToken, checkRole("admin"), upload, validatePackagesData, validate, addPackage);
router.delete("/packages/:id", verifyToken, deletePackage);
router.patch("/packages/:id", verifyToken, upload, validatePackagesData, validate, updatePackage);

//Boxes
router.get("/boxes", verifyToken, checkRole("admin"), getBoxes);
router.get("/boxes-location/:id", verifyToken, checkRole("admin"), getLocationWiseBoxes);
router.post("/boxes", verifyToken, checkRole("admin"), validateBoxesData, validate, addBoxes);
router.delete("/boxes/:id", verifyToken, checkRole("admin"),  deleteBoxes);
router.patch("/boxes/:id", verifyToken, checkRole("admin"), validateBoxesData, validate, updateBox);

//Terms and conditions
router.post("/terms-conditions", verifyToken, checkRole("admin"), addLocation);
router.get("/terms-conditions", verifyToken, getLocations);

//Users
router.get("/users", verifyToken, checkRole("admin"), getAllUsers);
router.patch("/users/:id", verifyToken, checkRole("admin"), validateId, validate, blockOrUnblockUser);
router.patch("/user-status/:id", verifyToken, checkRole("admin"), validateId, validate, activeOrInactiveUser);

module.exports = router;
