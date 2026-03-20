const { Product, Faq } = require("../models");

const getProducts = async (req, res, next) => {
  try {
    let products;
    const page = req.query.page || 1;
    const pageSize = 10;
    let query = {};

    if (req.query.criteria) {
      if (req.query.category) {
        query["category"] = req.query.category;
      }

      switch (req.query.criteria) {
        case "newArrivals": {
          const twoWeeksAgo = new Date();
          twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
          query["dateAdded"] = { $gte: twoWeeksAgo };
          break;
        }
        case "popular": {
          query["rating"] = { $gte: 4.0 };
          break;
        }
        default:
          break;
      }
      console.log(query);
      products = await Product.find(query)
        .select("-images -reviews -size")
        .skip((page - 1) * pageSize)
        .limit(pageSize);
    } else if (req.query.category) {
      products = await Product.find({ category: req.query.category })
        .select("-images -reviews -size")
        .skip((page - 1) * pageSize)
        .limit(pageSize);
    } else {
      products = await Product.find({})
        .select("-images -reviews -size")
        .skip((page - 1) * pageSize)
        .limit(pageSize);
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
    const product = await Product.findById(productId).populate("category");

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
      query = { category: req.query.category };
      if (req.query.genderAgeCategory) {
        query["genderAgeCategory"] = req.query.genderAgeCategory.toLowerCase();
      }
    } else if (req.query.genderAgeCategory) {
      query = {
        genderAgeCategory: req.query.genderAgeCategory.toLowerCase(),
      };
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

const chatWithAiAssistant = async (req, res, next) => {
  try {
    const message = req.query.message || "";

    if (!message) {
      // Message မပါရင် Rating အမြင့်ဆုံး ၅ ခုကိုပဲ အမြန်ပြပေးလိုက်မယ်
      const products = await Product.find({}).sort({ rating: -1 }).limit(5);
      return res.json({ type: "products", data: products });
    }

    const aiResponse = await ai_helper.generateVectorDataForSearch({
      prompt: message,
    });
    const queryVector = aiResponse["vector_data"];

    // ၁။ FAQ ရှာပြီး AI နဲ့ ပြန်ဖြေတဲ့အပိုင်း
    if (aiResponse["ask_about_us"] === true) {
      const faqResults = await Faq.aggregate([
        {
          $vectorSearch: {
            index: "faq_vector_index",
            path: "vector_data",
            queryVector: queryVector,
            numCandidates: 50, // ၅ ခုပဲ ယူမှာမို့ numCandidates ကို လျှော့ထားလို့ရပါတယ်
            limit: 3,
          },
        },
      ]);

      if (faqResults.length > 0) {
        const context = faqResults
          .map((f) => `Question: ${f.question} Answer: ${f.answer}`)
          .join("\n");
        const finalAiAnswer = await ai_helper.generateFinalResponse({
          userPrompt: message,
          context: context,
        });
        return res.json({ type: "faq", message: finalAiAnswer });
      }
    }

    // ၂။ Product ရှာတဲ့အပိုင်း (အနီးစပ်ဆုံး ၅ ခု)
    if (aiResponse["is_product_search"] === true) {
      const products = await Product.aggregate([
        {
          $vectorSearch: {
            index: "vector_index",
            path: "vector_data",
            queryVector: queryVector,
            numCandidates: 100,
            limit: 5, // ဒီမှာ ၅ ခုပဲ ကန့်သတ်လိုက်ပါပြီ
          },
        },
        {
          $addFields: {
            score: { $meta: "vectorSearchScore" }, // ဘယ်လောက်နီးစပ်လဲဆိုတဲ့ score ကိုပါ ထည့်ကြည့်လို့ရတယ်
          },
        },
      ]);

      if (products.length === 0) {
        return res
          .status(404)
          .json({ message: "ရှာဖွေနေတဲ့ ပစ္စည်း မတွေ့ပါဘူးဗျာ။" });
      }
      return res.json({ type: "products", data: products });
    }

    // ၃။ တခြား စကားပြောတဲ့ မေးခွန်းများ
    return res.json({ type: "chat", message: aiResponse["response_text"] });
  } catch (err) {
    console.error("Search Error:", err);
    next(err);
  }
};
module.exports = {
  getProducts,
  getProductById,
  searchProducts,
  chatWithAiAssistant,
};
