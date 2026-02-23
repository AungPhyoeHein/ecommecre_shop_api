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

module.exports = {chatWithAiAssistant}