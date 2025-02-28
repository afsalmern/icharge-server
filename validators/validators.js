const { body, param, validationResult } = require("express-validator");
const { ApiError } = require("../middlewares/error");

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

module.exports = { locationDataValidation, mobileNumberValidation, adminSignupValidation, adminLoginValidation, validateId, validate };
