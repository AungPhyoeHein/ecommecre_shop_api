const express = require('express');
const route = express.Router();
const {authController} = require('../controllers');

route.get('/',authController.login);

module.exports = route;