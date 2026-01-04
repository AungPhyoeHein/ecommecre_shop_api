const express = require('express');
const route = express.Router();
const {authController} = require('../controllers');
const { signupValidator, loginValidator, resetPasswordValidator, forgotPasswordValidator, verifyResetOTPValidator } = require('../validators/auth');

route.post('/register', signupValidator,authController.signUp);
route.post('/login', loginValidator,authController.login);
route.post('/forgot-password',forgotPasswordValidator,authController.forgotPassword);
route.post('/verify-otp',verifyResetOTPValidator,authController.verifyResetOTP);
route.post('/reset-password',resetPasswordValidator,authController.resetPassword);
route.post('/verify-token',authController.verifyToken);



module.exports = route;