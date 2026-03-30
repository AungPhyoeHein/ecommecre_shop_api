const express = require("express");
const {
  userController,
  categoryController,
  productController,
  orderController,
  faqController,
  adminController,
  monthlyTargetController,
  aiAdminController,
} = require("../controllers/admin");
const { createCategoryValidator } = require("../validators/category");
const { createProductValidator } = require("../validators/product");
const { createFaqValidator, updateFaqValidator } = require("../validators/faq");
const adminRouter = express.Router();

// ADMINS (Management)
adminRouter.get("/admins", adminController.getAdmins);
adminRouter.patch("/admins/:id/toggle", adminController.toggleAdminStatus);

// USERS
adminRouter.get("/users/count", userController.getUserCount);
adminRouter.get("/users", userController.getUsers);
adminRouter.patch("/users/:id/role", adminController.updateUserRole);
adminRouter.patch("/users/:id", userController.updateUser);
adminRouter.delete("/users/bulk", userController.bulkDeleteUsers);
adminRouter.delete("/users/:id", userController.deleteUser);

// CATEGORIES
adminRouter.post("/categories", categoryController.addCategory);
adminRouter.get("/categories/:id", categoryController.getCategoryById);
adminRouter.patch("/categories/:id", categoryController.editCategory);
adminRouter.delete("/categories/:id", categoryController.deleteCategory);

// PRODUCTS
adminRouter.get("/products/count", productController.getProductCount);
adminRouter.get("/products", productController.getProducts);
adminRouter.get("/products/:id", productController.getProductById);
adminRouter.post("/products", productController.addProduct);
adminRouter.patch("/products/:id", productController.editProduct);
adminRouter.delete(
  "/products/:id/images",
  productController.deleteProductImages,
);
adminRouter.delete("/products/:id", productController.deleteProduct);

// ORDERS
adminRouter.get("/orders/monthly-sales", orderController.getMonthlySales);
adminRouter.get("/orders/count", orderController.getOrdersCount);
adminRouter.get("/orders", orderController.getOrders);
adminRouter.patch("/orders/:id", orderController.changeOrderStatus);
adminRouter.delete("/orders/:id", orderController.deleteOrder);

// MONTHLY TARGET
adminRouter.get("/monthly-target", monthlyTargetController.getMonthlyTarget);
adminRouter.patch("/monthly-target", monthlyTargetController.setMonthlyTarget);

// FAQ
adminRouter.get("/faqs", faqController.getAllFaqs);
adminRouter.post("/faqs", createFaqValidator, faqController.createFaq);
adminRouter.post("/faqs/reindex", faqController.reindexFaqVectors);
adminRouter.patch("/faqs/:id", updateFaqValidator, faqController.updateFaq);
adminRouter.delete("/faqs/:id", faqController.deleteFaq);
adminRouter.get("/unanswered-questions", faqController.getUnansweredQuestions);
adminRouter.delete(
  "/unanswered-questions/:id",
  faqController.deleteUnansweredQuestion,
);

// AI ASSISTANT
adminRouter.post("/ai/chat", aiAdminController.chat);
adminRouter.get("/ai/history", aiAdminController.getHistory);
adminRouter.delete("/ai/history", aiAdminController.clearHistory);

module.exports = adminRouter;
