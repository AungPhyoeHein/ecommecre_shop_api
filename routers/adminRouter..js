const express = require('express');
const { userController, categoryController, productController, orderController } = require('../controllers/admin');
const { createCategoryValidator } = require('../validators/category');
const { createProductValidator } = require('../validators/product');
const adminRouter = express.Router();

//USERS
adminRouter.get('/users/count',userController.getUserCount);
adminRouter.delete('/users/:id',userController.deleteUser);


//CATEGORIES
adminRouter.post('/categories',categoryController.addCategory);
adminRouter.patch('/categories/:id',categoryController.editCategory);
adminRouter.delete('/categories/:id',categoryController.deleteCategory);

//PORDUCTS
adminRouter.get('/products/count',productController.getProductCount);
adminRouter.get('/products',productController.getProducts)
adminRouter.post('/products',productController.addProduct);
adminRouter.patch('/products/:id',productController.editProduct);
adminRouter.delete('/products/:id/images',productController.deleteProductImages);
adminRouter.delete('/products/:id',productController.deleteProduct);

//ORDERS
adminRouter.get('/orders',orderController.getOrders);
adminRouter.get('/orders/count',orderController.getOrdersCount);
adminRouter.patch('/orders/:id',orderController.changeOrderStatus)
adminRouter.delete('/orders/:id',orderController.deleteOrder)

module.exports = adminRouter;