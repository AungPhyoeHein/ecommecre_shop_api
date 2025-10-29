const { body } = require("express-validator");

const createProductValidator = [
  body("name").notEmpty().withMessage("Name is required."),
  body('description').notEmpty().withMessage('Description is required.'),
  body('price') .isFloat().withMessage('Price must be float.').notEmpty().withMessage('Price is required.'),
  body("sizes").notEmpty().withMessage("Name is required."),
  body("category").notEmpty().withMessage("Name is required."),
  body("countInStock").notEmpty().withMessage("CountInStock is required."),
];

module.exports = {createProductValidator};