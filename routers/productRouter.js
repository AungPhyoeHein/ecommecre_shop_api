// products.js
const express = require('express');
const { productController } = require('../controllers');
const router = express.Router();

router.get('/', productController.getProducts);

router.get('/:id',productController.getProductById);
router.get('/search',productController.searchProducts);

module.exports = router;
