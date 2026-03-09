const { Product, Faq } = require("../models");
const ai_helper = require("../helpers/ai_helper.js");

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

    if (!aiResponse) {
      return res.status(500).json({ message: "AI Assistant is currently unavailable." });
    }

    const queryVector = aiResponse["vector_data"];

    // ၁။ FAQ ရှာပြီး AI နဲ့ ပြန်ဖြေတဲ့အပိုင်း
    if (aiResponse["ask_about_us"] === true) {
      const faqResults = await Faq.aggregate([
        {
          $vectorSearch: {
            index: "faq_vector_index",
            path: "vector_data",
            queryVector: queryVector,
            numCandidates: 50,
            limit: 3,
          },
        },
        {
          $addFields: {
            score: { $meta: "vectorSearchScore" },
          },
        },
        {
          $match: {
            score: { $gte: 0.725 }
          }
        }
      ]);

      if (faqResults.length > 0) {
        const context = faqResults
          .map((f) => `Question: ${f.question} Answer: ${f.answer}`)
          .join("\n");
        const finalAiAnswer = await ai_helper.generateFinalResponse({
          userPrompt: message,
          context: context,
        });
        return res.json({ 
          type: "faq", 
          message: finalAiAnswer,
          response: aiResponse["response_text"] 
        });
      }
      return res.status(404).json({ 
        type: "faq",
        message: "ကျွန်တော်တို့ ဆိုင်နဲ့ပတ်သက်တဲ့ ဒီအချက်အလက်ကို မတွေ့ပါဘူးဗျာ။ (No similar information found about us)"
      });
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
            limit: 5,
          },
        },
        {
          $addFields: {
            score: { $meta: "vectorSearchScore" },
          },
        },
        {
          $match: {
            score: { $gte: 0.725 }
          }
        }
      ]);

      if (products.length > 0) {
        console.log("Product Scores for query:", message, products.map(p => ({ name: p.name, score: p.score })));
        return res.json({ 
          type: "products", 
          data: products,
          response: aiResponse["response_text"]
        });
      }
      // If not found, send only message
      return res.status(404).json({ 
        type: "products",
        message: "ရှာဖွေနေတဲ့ ပစ္စည်းနဲ့ ဆင်တူတဲ့ ပစ္စည်း မတွေ့ပါဘူးဗျာ။ (There is no product similar to that product)"
      });
    }

    // ၃။ တခြား စကားပြောတဲ့ မေးခွန်းများ
    return res.json({ type: "chat", response: aiResponse["response_text"] });
  } catch (err) {
    console.error("Search Error:", err);
    next(err);
  }
};

module.exports = {chatWithAiAssistant}
