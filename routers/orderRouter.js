const express = require('express');
const { orderController } = require('../controllers');
const router = express.Router();

router.get('/users/:userId', orderController.getUserOrders);
router.get('/:id',orderController.getOrderById);

module.exports = router;
