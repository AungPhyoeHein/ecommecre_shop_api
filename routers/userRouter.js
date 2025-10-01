const express = require('express');
const { userController } = require('../controllers');
const userRouter = express.Router();

userRouter.get('/',userController.getUsers);
userRouter.get('/:id',userController.getUserById);
userRouter.put('/:id',userController.updateUser);


module.exports = userRouter;