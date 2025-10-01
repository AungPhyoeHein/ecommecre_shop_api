const { body } = require("express-validator");

const signupValidator = [
  body("name").notEmpty().withMessage("Name is required."),
  body("email")
    .isEmail()
    .withMessage("Invalid email.")
    .notEmpty()
    .withMessage("Email is required."),
  body("password")
    .isStrongPassword()
    .withMessage('Password must contain at least one upercase,one lowercase and one symbol.')
    .isLength({ min: 8 })
    .withMessage("Password must be at last 8 characters.")
    .notEmpty()
    .withMessage("Password is required"),
  body("phone").isMobilePhone().withMessage('Please enter a valid phone number'),
];

const loginValidator = [
  body("email")
    .isEmail()
    .withMessage("Invalid email.")
    .notEmpty()
    .withMessage("Email is required."),
  body("password")
    .isStrongPassword()
    .withMessage('Password must contain at least one upercase,one lowercase and one symbol.')
    .isLength({ min: 8 })
    .withMessage("Password must be at last 8 characters.")
    .notEmpty()
    .withMessage("Password is required"),

];

const forgotPasswordValidator = [
  body("email")
    .isEmail()
    .withMessage("Invalid email.")
    .notEmpty()
    .withMessage("Email is required."),
 

];

const verifyResetOTPValidator = [
  body("email")
    .isEmail()
    .withMessage("Invalid email.")
    .notEmpty()
    .withMessage("Email is required."),
   body("otp")
    .isLength({ min: 4 })
    .withMessage("OTP must be at last 4 characters.")
    .notEmpty()
    .withMessage("OTP is required"),
];

const resetPasswordValidator = [
  body("email")
    .isEmail()
    .withMessage("Invalid email.")
    .notEmpty()
    .withMessage("Email is required."),
  body("newPassword")
    .isStrongPassword()
    .withMessage('Password must contain at least one upercase,one lowercase and one symbol.')
    .isLength({ min: 8 })
    .withMessage("Password must be at last 8 characters.")
    .notEmpty()
    .withMessage("Password is required"),
];


module.exports = {signupValidator,loginValidator,forgotPasswordValidator,verifyResetOTPValidator,resetPasswordValidator}