const express = require('express');
const { checkoutController } = require('../controllers');
const checkoutRouter = express.Router();

checkoutRouter.post('/',checkoutController.checkout);
checkoutRouter.post('/webhook',express.raw({type: 'application/json'}),checkoutController.webhook);

module.exports = checkoutRouter;