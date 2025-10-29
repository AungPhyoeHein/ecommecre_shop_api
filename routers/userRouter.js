const express = require('express');
const { userController } = require('../controllers');
const userRouter = express.Router();

userRouter.get('/',userController.getUsers);
userRouter.get('/:id',userController.getUserById);
userRouter.patch('/:id',userController.updateUser);


module.exports = userRouter;