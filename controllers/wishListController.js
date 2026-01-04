const mongoose = require("mongoose");
const { User, Product } = require("../models");

const getUserWishList = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.code = 404;
      throw new Error("User not found");
    }

    const wishlist = [];
    for (const wishProduct of user.wishlist) {
      const product = await Product.findById(wishProduct.productId);
      if (!product) {
        wishlist.push({
          ...wishProduct,
          productExists: false,
          productOutofstock: false,
        });
      } else if (product.countInStock < 1) {
        wishlist.push({
          ...wishProduct,
          productExists: true,
          productOutofStock: true,
        });
      } else {
        wishlist.push({
          productId: product._id,
          productImage: product.image,
          productPrice: product.price,
          productName: product.name,
          productExists: true,
          productOutofStock: false,
        });
      }
    }
    return res.json(wishlist);
  } catch (err) {
    next(err);
  }
};
const addToWishList = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.code = 404;
      throw new Error("User not found.");
    }

    if (!mongoose.isValidObjectId(req.body.productId) || !req.body.productId) {
      res.code = 400;
      throw new Error("Invalid request data");
    }

    const product = await Product.findById(req.body.productId);
    if (!product) {
      res.code = 404;
      throw new Error("Product not found.");
    }

    const productAlreadyExits = await user.wishlist.some((item) =>
      item.productId.equals(
        new mongoose.Types.ObjectId(req.body.productId)
      )
    );

    if (productAlreadyExits) {
      res.code = 409;
      throw new Error("Product already exit in wishlist.");
    }
    user.wishlist.push({
      productId: product._id,
      productName: product.name,
      productImage: product.image,
      productPrice: product.price,
    });
  
    await user.save();

    return res.json(user);
  } catch (err) {
    next(err);
  }
};

const removeFromWishList = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if(!user){
      res.code =404;
      throw new Error("User not found");
    }

    if (!mongoose.isValidObjectId(req.body.productId) || !req.body.productId) {
      res.code = 400;
      throw new Error("Invalid request data");
    }
    const index = user.wishlist.findIndex((item) => item.productId.equals(new mongoose.Types.ObjectId(req.body.productId)));

    if(index === -1) {
      res.code = 404;
      throw new Error('Product not found in wishlist');
    }

    user.wishlist.splice(index,1);
    await user.save();

    return res.status(204).end();
  } catch (err) {
    next(err);
  }
};

module.exports = { getUserWishList, addToWishList, removeFromWishList };
