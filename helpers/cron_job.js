const corn = require("node-cron");
const { Category, Product, CartProduct } = require("../models");
const mongoose = require("mongoose");

corn.schedule("0 0 * * *", async () => {
  try {
    const categoriesToBeDeleted = await Category.find({
      markedForDeletion: true,
    });
    for (const category of categoriesToBeDeleted) {
      const categoryProductsCount = await Product.countDocuments({
        category: category.id,
      });
      if (categoryProductsCount < 1) await category.deleteOne();
    }
    console.log("CRON job completed at ", new Date());
  } catch (err) {
    console.error("CRON job error: ", err);
  }
});

corn.schedule("*/30 * * * *", async () => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log("Reservation Relase CRON job started at", new Date());
    const expiredReservations = await CartProduct.find({
      reserved: true,
      reservationExpiry: { $lte: new Date() },
    });
    for (const cartProduct of expiredReservations) {
      const product = await Product.findById(cartProduct.product);
      if (product) {
        const updatedProduct = await Product.findByIdAndUpdate(
          product._id,
          { $inc: { countInStock: cartProduct.quantity } },
          { $new: true, runValidators: true, session }
        );

        if (!updatedProduct) {
          throw new Error(
            "Error Occurred: Product update failed. Potential concurrency issue."
          );
        }

        await CartProduct.findByIdAndUpdate(
          cartProduct._id,
          { reserved: false },
          { session }
        );
      }
    }
    await session.commitTransaction();
    console.log("Reservation Release CRON job completed at ", new Date());
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error(err.message);
    return;
  } finally {
    await session.endSession();
  }
});
