const mongoose = require("mongoose");
const { User, CartProduct, Product } = require("../models");

const getUserCart = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.code = 404;
      throw new Error("User not found.");
    }

    const cartProducts = await CartProduct.find({
      _id: { $in: user.cart },
    }).populate("product");

    const cart = [];

    for (const cartProduct of cartProducts) {
      const product = cartProduct.product;
      if (!product) {
        cart.push({
          ...cartProduct._doc,
          productExits: false,
          productOutOfStock: false,
        });
        cartProduct.product = product._id;
      } else {
        cartProduct.productName = product.name;
        cartProduct.productImage = product.image;
        cartProduct.productPrice = product.price;
        cartProduct.product = product._id;

        if (product.countInStock < cartProduct.quantity) {
          cart.push({
            ...cartProduct._doc,
            productExits: true,
            productOutOfStock: true,
          });
        } else {
          cart.push({
            ...cartProduct._doc,
            productExits: true,
            productOutOfStock: false,
          });
        }
      }
    }

    return res.json(cart);
  } catch (err) {
    next(err);
  }
};

const getUserCartCount = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.code = 404;
      throw new Error("User not found.");
    }
    const cartCount = user.cart.length;
    return res.json({ cartCount });
  } catch (err) {
    next(err);
  }
};

const getCartProductById = async (req, res, next) => {
  try {
    let cartProduct = await CartProduct.findById(req.cartProductId).populate(
      "product"
    );

    if (!cartProduct) {
      res.code = 404;
      throw new Error("Cart Product not found");
    }

    const product = cartProduct.product;

    if (!product) {
      cartProduct = {
        ...cartProduct._doc,
        productExits: false,
        productOutOfStock: false,
      };
    } else if (product.countInStock < 1) {
      cartProduct = {
        ...cartProduct._doc,
        productExits: false,
        productOutOfStock: true,
      };
    } else {
      cartProduct = {
        ...cartProduct._doc,
        productExits: true,
        productOutOfStock: true,
      };
    }

    return res.json(cartProduct);
  } catch (err) {
    next(err);
  }
};

const addToCart = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { productId, quantity, selectedSize, selectedColor } = req.body;
    if (!mongoose.isValidObjectId(productId)) {
      res.code = 400;
      throw new Error("Invalid request data");
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      res.code = 404;
      throw new Error("User not found!");
    }

    const product = await Product.findById(productId).session(session);

    if (!product) {
      res.code = 404;
      throw new Error("Product not Found");
    }

    const userCartProducts = await CartProduct.find({
      _id: {
        $in: user.cart,
      },
    });

    const existingCartItem = userCartProducts.some((item) =>
      item.product.equals(
        new mongoose.Types.ObjectId(productId) &&
          item.selectedSize === selectedSize &&
          item.selectedColor === selectedColor
      )
    );

    if (existingCartItem) {
      let condition = product.countInStock >= existingCartItem.quantity + 1;
      if (existingCartItem.reserved) {
        condition = product.countInStock >= 1;
      }
      if (condition) {
        existingCartItem.quantity += 1;
        await existingCartItem.save({ session });
        await Product.findOneAndUpdate({
          _id: productId,
          $inc: { countInStock: -1 },
        }).session(session);
        await session.commitTransaction();
        return res.status(200).end();
      }
      res.code = 404;
      throw new Error("Out of stoke");
    }

    if (product.countInStock < quantity) {
      return res
        .status(400)
        .json({
          message: `Insufficient stock. Only ${product.countInStock} left.`,
        });
    }

    const cartProduct = await new CartProduct({
      product: productId,
      productName: product.name,
      productImage: product.image,
      productPrice: product.price,
      quantity,
      selectedSize,
      selectedColor,
    }).save({ session });

    if (!cartProduct) {
      throw new Error("The product could not added to your cart.");
    }
    user.cart.push(cartProduct._id);
    await user.save({ session });
    const updatedProduct = await Product.findOneAndUpdate(
      { _id: productId, countInStock: { $gte: cartProduct.quantity } },
      { $inc: { countInStock: -cartProduct.quantity } },
      { new: true, session }
    );
    if (!updatedProduct) {
      res.code = 400;
      throw new Error("Insufficient stock or concurrency issue");
    }

    await session.commitTransaction();
    return res.status(201).json(cartProduct);
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    await session.endSession();
  }
};

const modifyProductQuantity = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!mongoose.isValidObjectId(req.params.cartProductId)) {
      res.code = 400;
      throw new Error("Invalid request data");
    }
    if (!user) {
      res.code = 404;
      throw new Error("User not found");
    }

    const { quantity } = req.body;

    let cartProduct = await CartProduct.findById(
      req.params.cartProductId
    ).populate("product");
    if (!cartProduct) {
      res.code = 404;
      throw new Error("Cart Product not found.");
    }
    const actualProduct = cartProduct.product;
    if (!actualProduct) {
      res.code = 404;
      throw new Error("Product does not exit.");
    }

    if (quantity > actualProduct.countInStock) {
      res.code = 400;
      throw new Error("Insufficient stock for the requested quantity");
    }
    cartProduct = await CartProduct.findByIdAndUpdate(
      req.params.cartProductId,
      quantity,
      { new: true }
    );

    if (!cartProduct) {
      res.code = 404;
      throw new Error("Product not found");
    }

    return res.json(cartProduct);
  } catch (err) {
    next(err);
  }
};

const removeFromCart = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = await User.findById(req.params.id);
    const { productId } = req.body;
    if (!mongoose.isValidObjectId(req.params.cartProductId)) {
      res.code = 400;
      throw new Error("Invalid request data");
    }
    if (!user) {
      res.code = 404;
      throw new Error("User not found");
    }

    if (!user.cart.includes(req.params.cartProductId)) {
      res.code = 404;
      throw new Error("Product not in your cart");
    }

    const cartItemToRemove = await CartProduct.findById(
      req.params.cartProductId
    );
    if (!cartItemToRemove) {
      res.code = 404;
      throw new Error("Cart Item not found");
    }

    if (cartItemToRemove.reserved) {
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: productId, countInStock: { $gte: cartProduct.quantity } },
        { $inc: { countInStock: -cartProduct.quantity } },
        { new: true, session }
      );

      if (!updatedProduct) {
        throw new Error("Internal Server Error");
      }

      user.cart.pull(cartItemToRemove._id);
      await user.save({ session });
      const cartProduct = await CartProduct.findByIdAndDelete(
        cartItemToRemove.id
      ).session(session);
      if (!cartProduct) {
        throw new Error("Internal Server Error");
      }
      await session.commitTransaction();
      return res.status(204).end();
    }
  } catch (err) {
    await session.abortTransaction();
    next();
  } finally {
    await session.endSession();
  }
};

module.exports = {
  getUserCart,
  getUserCartCount,
  getCartProductById,
  addToCart,
  modifyProductQuantity,
  removeFromCart,
};
