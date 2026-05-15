const { body, param, check, validationResult } = require("express-validator");
const { ApiError } = require("../middlewares/error");

const allowedTypesForPackageTypes = ["hourly", "weekly", "monthly", "free", "daily"];

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
  body("phone").not().isEmpty().withMessage("Phone number is required"),
];

const validateCorporate = [
  body("name").not().isEmpty().withMessage("Name is required"),
  body("email").not().isEmpty().withMessage("Email is required").bail().isEmail().withMessage("Email is not valid"),
  body("phone").not().isEmpty().withMessage("Phone number is required"),
];

const validateCorporateUpdate = [
  body("name").optional().not().isEmpty().withMessage("Name is required if provided"),
  body("email")
    .optional()
    .not()
    .isEmpty()
    .withMessage("Email is required if provided")
    .bail()
    .isEmail()
    .withMessage("Email is not valid if provided"),
  body("phone").optional().not().isEmpty().withMessage("Phone number is required if provided"),
];

const mobileNumberValidation = [
  body("mobile").not().isEmpty().withMessage("Mobile number is required"),
  // .bail() // Stops validation if empty
  // .isMobilePhone("en-IN")
  // .withMessage("Mobile number is not valid"),
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
  body("type")
    .not()
    .isEmpty()
    .withMessage("Type is required")
    .bail()
    .isIn(allowedTypesForPackageTypes)
    .withMessage("Type must be one of " + allowedTypesForPackageTypes.join(", ")),
];

const validateBoxesData = [
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

const validateKycDataUpdate = [
  body("kyc_id").not().isEmpty().withMessage("Kyc id is required"),
  body("full_name").not().isEmpty().withMessage("Full name is required"),
  body("proof_type").not().isEmpty().withMessage("Proof type is required"),
  body("proof_number").not().isEmpty().withMessage("Proof number is required"),
];

const validateDisputeData = [
  body("rental_id").not().isEmpty().withMessage("Rental id is required"),
  body("dispute").not().isEmpty().withMessage("Reason is required"),
];

const validateReferelCode = [
  body("code")
    .not()
    .isEmpty()
    .withMessage("Code is required")
    .isString()
    .withMessage("Code must be a string")
    .isLength({ max: 255 })
    .withMessage("Code cannot exceed 255 characters"),

  body("type")
    .not()
    .isEmpty()
    .withMessage("Type is required")
    .isIn(["location", "corporate"])
    .withMessage("Type must be either 'location' or 'corporate'"),

  body("reference_id").not().isEmpty().withMessage("Entity id is required"),
];
const validateReferelCodeUpdate = [
  body("code").optional().isString().withMessage("Code must be a string").isLength({ max: 255 }).withMessage("Code cannot exceed 255 characters"),

  body("type").optional().isIn(["location", "corporate"]).withMessage("Type must be either 'location' or 'corporate'"),

  body("reference_id").optional().not().isEmpty().withMessage("Entity id is required"),

  body("is_active").optional().isBoolean().withMessage("is_active must be a boolean value"),

  body("is_valid").optional().isBoolean().withMessage("is_valid must be a boolean value"),
];

const forgotPasswordValidation = [
  body("email").not().isEmpty().withMessage("Email is required").bail().isEmail().withMessage("Email is not valid"),
];

const resetPasswordValidation = [
  body("token").not().isEmpty().withMessage("Reset token is required"),
  body("password").not().isEmpty().withMessage("Password is required").bail().isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
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
  forgotPasswordValidation,
  resetPasswordValidation,
  validatePackagesData,
  validateBoxesData,
  validateId,
  validateKycData,
  validateKycDataUpdate,
  validateDisputeData,
  validateReferelCode,
  validateReferelCodeUpdate,
  validateCorporate,
  validateCorporateUpdate,
  validate,
};
