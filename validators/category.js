const { body } = require("express-validator");

const createCategoryValidator = [
  body("name").notEmpty().withMessage("Name is required."),
];

module.exports = {createCategoryValidator};