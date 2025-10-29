const express = require('express');
const { categoryController } = require('../controllers');
const categoryRouter = express.Router();


categoryRouter.get('/',categoryController.getCategories);
categoryRouter.get('/:id',categoryController.getCategoryById);


module.exports = categoryRouter;