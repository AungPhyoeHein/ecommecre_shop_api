const { Product, Faq, UnansweredQuestion, ChatHistory } = require("../models");
const ai_helper = require("../helpers/ai_helper.js");

const chatWithAiAssistant = async (req, res, next) => {
  try {
    const message = req.query.message || "";
    const userId = req.user?.id; // Assuming auth middleware provides this

    // Fetch chat history if user is logged in
    let chatHistory = [];
    let chatHistoryDoc = null;
    if (userId) {
      chatHistoryDoc = await ChatHistory.findOne({ userId, isDeleted: false });
      if (chatHistoryDoc) {
        chatHistory = chatHistoryDoc.messages.map(m => ({
          role: m.role,
          parts: m.parts
        }));
      }
    }

    if (!message) {
      // Message မပါရင် Rating အမြင့်ဆုံး ၅ ခုကိုပဲ အမြန်ပြပေးလိုက်မယ်
      const products = await Product.find({}).sort({ rating: -1 }).limit(5);
      
      const filteredProducts = products.map(p => ({
        _id: p._id,
        name: p.name,
        price: p.price,
        description: p.description,
        sizes: p.sizes,
        image: p.image,
        rating: p.rating
      }));

      return res.json({ 
        type: "products", 
        message: "Check out our top-rated products!",
        data: filteredProducts 
      });
    }

    // Function to update chat history
    const updateChatHistory = async (userMsg, aiMsg) => {
      if (!userId) return;
      try {
        if (!chatHistoryDoc) {
          chatHistoryDoc = new ChatHistory({
            userId,
            messages: []
          });
        }
        chatHistoryDoc.messages.push({ role: 'user', parts: [{ text: userMsg }] });
        chatHistoryDoc.messages.push({ role: 'model', parts: [{ text: aiMsg }] });
        await chatHistoryDoc.save();
      } catch (err) {
        console.error("Error updating chat history:", err);
      }
    };

    const intentResponse = await ai_helper.classifyIntent(message, chatHistory);

    if (!intentResponse) {
      return res.status(500).json({ message: "AI Assistant is currently unavailable." });
    }

    const isMyanmarText = (text) => /[\u1000-\u109F]/.test(text || "");
    const notAvailableMessage = isMyanmarText(message)
      ? "ဒီပစ္စည်းကို ကျွန်တော်တို့ဆိုင်မှာ မရနိုင်သေးပါဘူး။"
      : "That product is not available in our store right now.";

    const escapeRegex = (text) => (text || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const filterProductForResponse = (p) => ({
      _id: p._id,
      name: p.name,
      price: p.price,
      description: p.description,
      sizes: p.sizes,
      image: p.image,
      rating: p.rating,
      ...(p.score !== undefined ? { score: p.score } : {})
    });

    // ၀။ Recommend ပေးတဲ့အပိုင်း
    if (intentResponse.is_recommend_request === true) {
      let products = [];

      if ((intentResponse.search_query || "").trim()) {
        const vectorResponse = await ai_helper.generateVectorDataForSearch({
          prompt: intentResponse.search_query || message,
        });

        if (vectorResponse) {
          const queryVector = vectorResponse.vector_data;
          products = await Product.aggregate([
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
          ]);
        }
      }

      if (!products.length) {
        products = await Product.find({}).sort({ rating: -1 }).limit(5);
      }

      const filteredProducts = products.map(filterProductForResponse);

      const introMessage = intentResponse.response_text ||
        (isMyanmarText(message)
          ? "သင့်အတွက် အကြိုက်ဆုံး ပစ္စည်းတွေကို အောက်မှာ အကြံပြုထားပါတယ်။"
          : "Here are some products I recommend for you.");

      await updateChatHistory(message, introMessage);

      return res.json({
        type: "recommend",
        message: introMessage,
        data: filteredProducts,
      });
    }

    // ၁။ FAQ ရှာပြီး AI နဲ့ ပြန်ဖြေတဲ့အပိုင်း
    if (intentResponse.ask_about_us === true) {
      const vectorResponse = await ai_helper.generateVectorDataForSearch({
        prompt: message, // Use full message for FAQ embedding
      });

      if (!vectorResponse) {
        // Record even if vector search fails for admin to see what they missed
        try {
          await UnansweredQuestion.create({
            question: message,
            intent: "faq"
          });
        } catch (e) {}
        return res.status(500).json({ message: "Vector search unavailable." });
      }

      const queryVector = vectorResponse.vector_data;
      const faqResults = await Faq.aggregate([
        {
          $vectorSearch: {
            index: "faq_vector_index",
            path: "vector_data",
            queryVector: queryVector,
            numCandidates: 100,
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
            score: { $gte: 0.85 }
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
          chatHistory: chatHistory
        });
        await updateChatHistory(message, finalAiAnswer);
        return res.json({ 
          type: "faq", 
          message: finalAiAnswer
        });
      }
      const notFoundMessage = await ai_helper.generateNotFoundResponse({
        userPrompt: message,
        type: "faq",
        chatHistory: chatHistory
      });
      await updateChatHistory(message, notFoundMessage);
      // Store unanswered question for admin
      try {
        await UnansweredQuestion.create({
          question: message,
          intent: "faq"
        });
      } catch (saveError) {
        console.error("Error saving unanswered FAQ question:", saveError);
      }
      return res.status(404).json({ 
        type: "faq",
        message: notFoundMessage
      });
    }

    // ၂။ Product ရှာတဲ့အပိုင်း (အနီးစပ်ဆုံး ၅ ခု)
    if (intentResponse.is_product_search === true) {
      const searchTerm = (intentResponse.search_query || message || "").trim();
      let products = [];

      const vectorResponse = await ai_helper.generateVectorDataForSearch({
        prompt: searchTerm || message,
      });

      if (vectorResponse) {
        const queryVector = vectorResponse.vector_data;
        products = await Product.aggregate([
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
              score: { $gte: 0.8 }
            }
          }
        ]);
      }

      if (!products.length && searchTerm) {
        const tokens = searchTerm.split(/\s+/).filter(Boolean);
        const regex = new RegExp(tokens.map(escapeRegex).join("|"), "i");
        products = await Product.find({
          $or: [{ name: regex }, { description: regex }]
        }).limit(5);
      }

      if (products.length > 0) {
        console.log("Product Search Scores:", products.map(p => ({ name: p.name, score: p.score })));
        
        // Filter products to only include specific fields for AI and user
        const filteredProducts = products.map(filterProductForResponse);

        const aiMessage = await ai_helper.generateProductFoundResponse({ 
          userPrompt: message, 
          products: filteredProducts,
          chatHistory: chatHistory
        });

        await updateChatHistory(message, aiMessage);

        return res.json({ 
          type: "products", 
          message: aiMessage, 
          data: filteredProducts
        });
      }
      await updateChatHistory(message, notAvailableMessage);
      // Store unanswered question for admin
      try {
        await UnansweredQuestion.create({
          question: message,
          intent: "products"
        });
      } catch (saveError) {
        console.error("Error saving unanswered product search:", saveError);
      }
      return res.status(404).json({ 
        type: "products",
        message: notAvailableMessage
      });
    }

    // ၃။ တခြား စကားပြောတဲ့ မေးခွန်းများ
    const finalAiMessage = intentResponse.response_text || "မင်္ဂလာပါ။ ဘာကူညီပေးရမလဲခင်ဗျာ။ (Hello, how can I help you?)";
    await updateChatHistory(message, finalAiMessage);
    return res.json({ type: "chat", response: finalAiMessage });
  } catch (err) {
    console.error("Search Error:", err);
    next(err);
  }
};

module.exports = {chatWithAiAssistant}
