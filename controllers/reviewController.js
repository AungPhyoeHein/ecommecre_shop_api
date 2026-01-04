const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { User, Review, Product } = require("../models");

const leaveReview = async (req, res, next) => {
  try {
    const user = await User.findById(req.user);
    if (!user) {
      res.code = 404;
      throw new Error("Invalid User!");
    }
    if(!mongoose.isValidObjectId(req.params.id)){
      res.code = 400;
      throw new Error("Invalid request data");
    }
    let product = await Product.findById(req.params.id).populate('reviews');
    if (!product) {
      res.code = 404;
      throw new Error("Product not found");
    }
    const hasReview= product.reviews.some((review) => review.user.equals(new mongoose.Types.ObjectId(req.user)));
    if(hasReview){
      res.code = 409;
      throw new Error("User can only leave 1 review.");
    }

    const review = await new Review({
      ...req.body,
      user,
      userName: user.name,
    }).save();

    if (!review) {
      req.code = 400;
      throw new Error("The review could not be added");
    }

    product.reviews.push(review.id);
    product = await product.save();
    if (!product) {
      throw new Error("Internal Server Error");
    }
    return res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
};

const getProductReviews = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(req.user);
    if(!mongoose.isValidObjectId(req.params.id)){
      res.code = 400;
      throw new Error("Invalid request data");
    }
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.code = 404;
      throw new Error("Product not founds");
    }

    const page = req.query.page || 1;
    let pageSize = 10;
    const processedReviews = [];
    if (page == 1) {
      const currentUserReview = await Review.findOne({
        _id: { $in: product.reviews },
        user: req.user,
      });
      if (currentUserReview) {
        pageSize--;
        let newReview;
        if (currentUserReview.userName !== user.name) {
          currentUserReview.userName = user.name;
          newReview = await currentUserReview.save({ session });
        }
        processedReviews.push(newReview ?? currentUserReview);
      }
    }

    const reviews = await Review.find({
      _id: { $in: product.reviews },
      user: { $ne: req.user },
    })
      .sort({ date: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    for (const review of reviews) {
      const user = await User.findById(review.user);
      if (!user) {
        processedReviews.push(review);
        continue;
      }

      let newReview;
      if (review.userName !== user.name) {
        review.userName = user.name;
        newReview = await review.save({ session });
      }
      processedReviews.push(newReview ?? review);
    }

    await session.commitTransaction();
    return res.json(processedReviews);
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};


const editProductReview = async (req,res,next) =>{
  try {
    const user = req.user;
    const {productId,reviewId} = req.params;
    if(!mongoose.isValidObjectId(productId) || !mongoose.isValidObjectId(reviewId)){
      res.code = 400;
      throw new Error("Invalid request data");
    }
    const product = await Product.findById(productId);

    if(!product){
      res.code = 404;
      throw new Error("Product not found");
    }
    const hasReview=product.reviews.some((review) => review._id.toString() === reviewId);

    if(!hasReview){
      res.code = 404;
      throw new Error("Review not found in this product");
    }
    
    const review = await Review.findById(reviewId);
    const {rating,comment} = req.body;

    if(!review) {
      res.code = 404;
      throw new Error("Review not found.");
    }

    if(!review.user.equals(user)){
      res.code = 403;
      throw new Error("You cannot edit other review.");
    }

    const updatedReview = await Review.findByIdAndUpdate(reviewId,{rating,comment},{new: true});
    await product.save();

    if(!updatedReview){
      throw new Error("Review cannot edit.");
    }

    return res.json(updatedReview);
  } catch (err) {
    next(err);
  }
}

const deleteProductReview = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { productId, reviewId } = req.params;

    if(!mongoose.isValidObjectId(productId) || !mongoose.isValidObjectId(reviewId)){
      res.code = 400;
      throw new Error("Invalid request data");
    }

    const review = await Review.findById(reviewId).session(session);
    if (!review) {
      res.code = 404;
      throw new Error("Review not found");
    }
    if (!review.user.equals(req.user)) {
      res.code = 403;
      throw new Error("You can't delete other reviews");
    }
    
    const isSuccess = await Review.findByIdAndDelete(reviewId, { session });
    if (!isSuccess) {
      throw new Error("Internal Server Error: Failed to delete review document.");
    }

    const product = await Product.findById(productId).session(session);
    
    if (product) {
      product.reviews = product.reviews.filter(
        (id) => id.toString() !== reviewId
      );
      await product.save({ session });
    }

    await session.commitTransaction();
    return res.status(204).end(); 

  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

module.exports = { leaveReview, getProductReviews,editProductReview ,deleteProductReview};
