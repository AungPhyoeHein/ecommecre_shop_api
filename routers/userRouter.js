const express = require('express');
const { userController, wishListController, categoryController, cartController } = require('../controllers');
const userRouter = express.Router();

userRouter.get('/',userController.getUsers);
userRouter.get('/:id',userController.getUserById);
userRouter.patch('/:id',userController.updateUser);

//WishList
userRouter.get('/:id/wishlist',wishListController.getUserWishList);
userRouter.post('/:id/wishlist',wishListController.addToWishList);
userRouter.delete('/:id/wishlist',wishListController.removeFromWishList);

//Cart
userRouter.get('/:id/cart',cartController.getUserCart);
userRouter.get('/:id/cart/count',cartController.getUserCartCount);
userRouter.get('/:id/cart/:cartProductId',cartController.getCartProductById);
userRouter.post('/:id/cart',cartController.addToCart);
userRouter.put('/:id/cart/:cartProductId',cartController.modifyProductQuantity);
userRouter.delete('/:id/cart/:cartProductId',cartController.removeFromCart);


module.exports = userRouter;