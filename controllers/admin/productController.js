const media_helper = require("../../helpers/media_helper");
const util = require("util");
const { validationResult } = require("express-validator");
const ai_helper = require("../../helpers/ai_helper.js");

const { Category, Product, Review } = require("../../models");
const { default: mongoose } = require("mongoose");

const getProductCount = async (req, res, next) => {
  try {
    const count = Product.countDocuments();
    if (!count && count != 0) {
      throw new Error("Could not count orders!");
    }
    return res.json({ count });
  } catch (err) {
    next(err);
  }
};

const addProduct = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessage = errors.array().map((error) => ({
      field: error.path,
      message: error.msg,
    }));
    return res.status(400).json({ errors: errorMessage });
  }
  try {
    const uploadImage = util.promisify(
      media_helper.upload.fields([
        {
          name: "image",
          maxCount: 1,
        },
        {
          name: "images",
          maxCount: 10,
        },
      ]),
    );

    try {
      await uploadImage(req, res);
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        type: error.code,
        message: `${error.message}{${error.fields}}`,
        storageErrors: error.storageErrors,
      });
    }

    const category = await Category.findById(req.body.category);
    if (!category) {
      res.code = 404;
      throw new Error("Invalid Category");
    }

    if (category.markedForDeletion) {
      res.code = 404;
      throw new Error(
        "Category marked for deletion, you cannot add products to this category.",
      );
    }

    const imageArray = req.files["image"];
    if (!imageArray || imageArray.length === 0) {
      res.code = 400;
      throw new Error("Image file is required.");
    }
    const image = imageArray[0];

    if (image.path && image.path.startsWith("http")) {
      req.body["image"] = image.path;
    } else {
      req.body["image"] =
        `${req.protocol}://${req.get("host")}/${image.path.replace(/\\/g, "/")}`;
    }

    const gallery = req.files["images"];
    const imagePaths = [];
    if (gallery) {
      for (const img of gallery) {
        if (img.path && img.path.startsWith("http")) {
          imagePaths.push(img.path);
        } else {
          const imagePath = `${req.protocol}://${req.get("host")}/${img.path.replace(/\\/g, "/")}`;
          imagePaths.push(imagePath);
        }
      }
    }

    if (imagePaths.length > 0) {
      req.body["images"] = imagePaths;
    }
    req.body["createdBy"] = req.user;
    const product = await new Product(req.body).save();
    if (!product) {
      throw new Error("The product could not be created");
    }

    res.status(201).json(product);

    // Run AI analysis in the background
    (async () => {
      try {
        const aiResult = await ai_helper.generateVectorDataForAddProduct({
          ...product.toObject(),
          categoryName: category.name,
        });

        if (!aiResult) {
          throw new Error("AI analysis returned no result.");
        }

        await Product.findByIdAndUpdate(product._id, {
          vector_data: aiResult.vector_data,
          aiStatus: "completed",
        });
      } catch (aiError) {
        console.error("AI Analysis Background Error:", aiError.message);
        await Product.findByIdAndUpdate(product._id, {
          aiStatus: "error",
        });
      }
    })();
  } catch (err) {
    next(err);
  }
};

const editProduct = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.code = 400;
      throw new Error("Invalid Product ID!");
    }

    const upload = util.promisify(
      media_helper.upload.fields([
        { name: "image", maxCount: 1 },
        { name: "images", maxCount: 10 },
      ]),
    );

    try {
      await upload(req, res);
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        type: error.code,
        message: `${error.message}{${error.fields}}`,
        storageErrors: error.storageErrors,
      });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      res.code = 404;
      throw new Error("Product not found!");
    }

    if (req.body.category) {
      const category = await Category.findById(req.body.category);
      if (!category) {
        res.code = 404;
        throw new Error("Invalid Category!");
      }

      if (category.markedForDeletion) {
        res.code = 404;
        throw new Error(
          "Category marked for deletion, you cannot add products to this category.",
        );
      }
    }

    // Handle main image
    if (req.files && req.files["image"]) {
      const image = req.files["image"][0];
      if (image.path && image.path.startsWith("http")) {
        req.body["image"] = image.path;
      } else {
        req.body["image"] =
          `${req.protocol}://${req.get("host")}/${image.path.replace(/\\/g, "/")}`;
      }
    }

    // Handle gallery images
    if (req.files && req.files["images"]) {
      const gallery = req.files["images"];

      const bodyImages = req.body.images
        ? Array.isArray(req.body.images)
          ? req.body.images
          : [req.body.images]
        : null;

      const existingImagesCount = bodyImages
        ? bodyImages.length
        : product.images
          ? product.images.length
          : 0;

      if (existingImagesCount + gallery.length > 10) {
        res.code = 400;
        throw new Error("Total gallery images cannot exceed 10.");
      }
      const imagePaths = [];
      for (const img of gallery) {
        if (img.path && img.path.startsWith("http")) {
          imagePaths.push(img.path);
        } else {
          const imagePath = `${req.protocol}://${req.get("host")}/${img.path.replace(/\\/g, "/")}`;
          imagePaths.push(imagePath);
        }
      }

      // Use the provided order of existing images if available
      const existingImages = bodyImages || product.images || [];

      req.body["images"] = [...existingImages, ...imagePaths];
    } else if (req.body.images) {
      // If only reordering existing images (no new files)
      req.body["images"] = Array.isArray(req.body.images)
        ? req.body.images
        : [req.body.images];
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true },
    );

    if (!updatedProduct) {
      res.code = 404;
      throw new Error("Product not found");
    }

    res.json(updatedProduct);

    // Run AI analysis in the background
    (async () => {
      try {
        const aiResult = await ai_helper.generateVectorDataForAddProduct({
          ...updatedProduct.toObject(),
          categoryName: (await Category.findById(updatedProduct.category)).name,
        });

        if (!aiResult) {
          throw new Error("AI analysis returned no result.");
        }

        await Product.findByIdAndUpdate(updatedProduct._id, {
          vector_data: aiResult.vector_data,
          aiStatus: "completed",
        });
      } catch (aiError) {
        console.error("AI Analysis Background Error:", aiError.message);
        await Product.findByIdAndUpdate(updatedProduct._id, {
          aiStatus: "error",
        });
      }
    })();
  } catch (err) {
    next(err);
  }
};

const deleteProductImages = async (req, res, next) => {
  try {
    const productId = req.params.id;
    const { deletedImageUrls } = req.body;
    if (
      !mongoose.isValidObjectId(productId) ||
      !Array.isArray(deletedImageUrls)
    ) {
      res.code = 400;
      throw new Error("Invalid requrest data");
    }

    await media_helper.deleteImages(deletedImageUrls);
    const product = await Product.findById(productId);
    if (!product) {
      res.code = 404;
      throw new Error("Product not found");
    }

    product.images = product.images.filter(
      (image) => !deletedImageUrls.includes(image),
    );
    await product.save();

    return res.status(204).end();
  } catch (err) {
    if (err.code == "ENOENT") {
      return res.status(404).json({ message: "Image not found" });
    }
    next(err);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const productId = req.params.id;
    if (!mongoose.isValidObjectId(productId)) {
      res.code = 400;
      throw new Error("Invalid request data");
    }

    const product = Product.findById(req.params.id);
    if (!product) {
      res.code = 404;
      throw new Error("Product not found");
    }

    await media_helper.deleteImages(
      [...product.images, product.image],
      "ENOENT",
    );

    await Review.deleteMany({ _id: { $in: product.reviews } });

    await Product.findByIdAndDelete(productId);

    return res.status(204).end();
  } catch (err) {
    next(err);
  }
};

const getProducts = async function (req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const search = req.query.search || "";
    const sort = req.query.sort || "-createdAt";

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate("category", "name")
      .populate("createdBy", "name email")
      .select("-reviews -ratings")
      .sort(sort)
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    if (!products) {
      res.code = 404;
      throw new Error("Products not found");
    }
    return res.json({
      success: true,
      data: products,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    next(err);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("category", "name")
      .populate("createdBy", "name email");
    if (!product) {
      res.code = 404;
      throw new Error("Product not found");
    }
    res.json(product);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProductCount,
  addProduct,
  editProduct,
  deleteProductImages,
  deleteProduct,
  getProducts,
  getProductById,
};
