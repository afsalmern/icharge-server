const { body, param, check, validationResult } = require("express-validator");
const { ApiError } = require("../middlewares/error");

const allowedTypesForPackageTypes = ["hourly", "weekly", "monthly"];

const locationDataValidation = [
  body("name").not().isEmpty().withMessage("Name is required"),

  body("latitude")
    .not()
    .isEmpty()
    .withMessage("Latitude is required")
    .bail() // Stops validation if empty
    .isDecimal()
    .withMessage("Latitude is not valid"),

  body("longitude")
    .not()
    .isEmpty()
    .withMessage("Longitude is required")
    .bail() // Stops validation if empty
    .isDecimal()
    .withMessage("Longitude is not valid"),

  body("address").not().isEmpty().withMessage("Address is required"),
];

const mobileNumberValidation = [
  body("mobile")
    .not()
    .isEmpty()
    .withMessage("Mobile number is required")
    .bail() // Stops validation if empty
    .isMobilePhone("en-IN")
    .withMessage("Mobile number is not valid"),
];

const adminSignupValidation = [
  body("firstName").not().isEmpty().withMessage("First name is required"),
  body("email").not().isEmpty().withMessage("Email is required").bail().isEmail().withMessage("Email is not valid"),
  body("password").not().isEmpty().withMessage("Password is required"),
];

const adminLoginValidation = [
  body("email").not().isEmpty().withMessage("Email is required").bail().isEmail().withMessage("Email is not valid"),
  body("password").not().isEmpty().withMessage("Password is required"),
];

const validateId = [
  param("id").notEmpty().withMessage("ID is required").isInt().withMessage("ID must be an integer").toInt(), // Converts the ID to an integer if it's a string number
];

const validatePackagesData = [
  body("name").not().isEmpty().withMessage("Name is required"),
  body("price").not().isEmpty().withMessage("Price is required").bail().isNumeric().withMessage("Price must be a number"),
  body("duration").not().isEmpty().withMessage("Duration is required").bail().isNumeric().withMessage("Duration must be a number"),
  body("description").not().isEmpty().withMessage("Description is required").bail().isString().withMessage("Description must be a string"),
  body("swap").not().isEmpty().withMessage("Swap is required").bail().isNumeric().withMessage("Swap must be a number"),
  body("type")
    .not()
    .isEmpty()
    .withMessage("Type is required")
    .bail()
    .isIn(allowedTypesForPackageTypes)
    .withMessage("Type must be one of " + allowedTypesForPackageTypes.join(", ")),
];

const validateBoxesData = [
  body("location_id").not().isEmpty().withMessage("Location is required"),
  body("device_id").not().isEmpty().withMessage("Device id is required"),
  body("unique_id").not().isEmpty().withMessage("Unique id is required"),
  body("total_powerbanks").not().isEmpty().withMessage("Number of power banks are required"),
  body("available_powerbanks").not().isEmpty().withMessage("Number of power banks available are required"),
];

const validateKycData = [
  body("full_name").not().isEmpty().withMessage("Full name is required"),
  body("proof_type").not().isEmpty().withMessage("Proof type is required"),
  body("proof_number").not().isEmpty().withMessage("Proof number is required"),
  check("proof_front").custom((value, { req }) => {
    if (!req.files || !req.files["proof_front"]) {
      throw new Error("Proof front image is required");
    }
    return true;
  }),
  check("photo").custom((value, { req }) => {
    if (!req.files || !req.files["photo"]) {
      throw new Error("Kyc photo is required");
    }
    return true;
  }),

  check("proof_back").custom((value, { req }) => {
    if (!req.files || !req.files["proof_back"]) {
      throw new Error("Proof back image is required");
    }
    return true;
  }),
];

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors
      .array()
      .map((err) => err.msg)
      .join(", ");
    return next(new ApiError(400, errorMessages));
  }
  next();
};

module.exports = {
  locationDataValidation,
  mobileNumberValidation,
  adminSignupValidation,
  adminLoginValidation,
  validatePackagesData,
  validateBoxesData,
  validateId,
  validateKycData,
  validate,
};
