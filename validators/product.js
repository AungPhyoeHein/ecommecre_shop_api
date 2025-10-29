const { check } = require("express-validator");

const createProductValidator = [
  check("name").notEmpty().withMessage("Name is required."),
  check('description').notEmpty().withMessage('Description is required.'),
  check('price') .isFloat().withMessage('Price must be float.').notEmpty().withMessage('Price is required.'),
  check("image").notEmpty().withMessage("Image is required."),
  check("images").notEmpty().withMessage("Images is required."),
  check("sizes").notEmpty().withMessage("Name is required."),
  check("category").notEmpty().withMessage("Name is required."),
  check("countInStock").notEmpty().withMessage("CountInStock is required."),
];

module.exports = {createProductValidator};