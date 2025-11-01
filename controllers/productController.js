const { Product } = require("../models");

const getProducts = async (req, res, next) => {
  try {
    let products;
    const page = req.query.page || 1;
    const pageSize = 10;
    let query = {};

    if (req.query.criteria) {
      query["category"] = req.query.category;

      switch (req.query.criteria) {
        case "newArrivals": {
          const towWeeksAgo = new Date();
          towWeeksAgo.setDate(towWeeksAgo.getDate() - 14);
          query["dateAdded"] = { $gte: towWeeksAgo };
          break;
        }
        case "popular": {
          query["rating"] = { $gte: 4.5 };
          break;
        }
        default:
          break;
      }
      products = await Product.find(query)
        .select("-images -reviews -size")
        .skip(page - 1 * pageSize)
        .limit(pageSize);
    } else if (req.query.category) {
      products = await Product.find({ category: req.query.category })
        .select("-images -reviews -size")
        .skip(page - 1 * pageSize)
        .limit(pageSize);
    } else {
      if (req.query.category) {
        products = await Product.find({})
          .select("-images -reviews -size")
          .skip(page - 1 * pageSize)
          .limit(pageSize);
      }
    }

    if (!products) {
      res.code = 404;
      throw new Error("Products not found");
    }
    return res.json(products);
  } catch (err) {
    next(err);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);

    if (!product) {
      res.code = 404;
      throw new Error("Product not found.");
    }

    return res.json(product);
  } catch (err) {
    next(err);
  }
};

const searchProducts = async (req, res, next) => {
  try {
    const searchKey = req.query.search || "";
    const page = req.query.page || 1;
    const pageSize = 10;

    let query = {};

    if (req.query.category) {
      let query = { category: req.query.category };
      if (req.query.genderAgeCategory) {
        query["genderAgeCategory"] = req.query.genderAgeCategory.toLowerCase();
      }
      if (searchKey) {
        query = {
          ...query,
          $text: {
            $search: searchKey,
            $language: "none",
            $caseSensitive: false,
          },
        };
      }
    } else if (req.query.genderAgeCategory) {
      let query = {
        genderAgeCategory: req.query.genderAgeCategory.toLowerCase,
      };
      if (searchKey) {
        query = {
          ...query,
          $text: {
            $search: searchKey,
            $language: "none",
            $caseSensitive: false,
          },
        };
      }
    }
    const products = await Product.find(query)
      .sort({ rating: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    if (!products) {
      res.code = 404;
      throw new Error("Products not found");
    }

    return res.json(products);
  } catch (err) {
    next(err);
  }
};

module.exports = { getProducts, getProductById, searchProducts };
