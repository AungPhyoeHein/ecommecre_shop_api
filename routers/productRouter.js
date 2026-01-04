const express = require('express');
const { productController, reviewController } = require('../controllers');
const router = express.Router();

router.get('/', productController.getProducts);
router.get('/search',productController.searchProducts);
router.get('/:id',productController.getProductById);

//Reviews
router.post('/:id/reviews',reviewController.leaveReview);
router.get('/:id/reviews',reviewController.getProductReviews);
router.patch('/:productId/reviews/:reviewId',reviewController.editProductReview);
router.delete('/:productId/reviews/:reviewId',reviewController.deleteProductReview)



module.exports = router;
