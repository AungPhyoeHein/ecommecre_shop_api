const { Product, Faq, UnansweredQuestion, ChatHistory } = require("../models");
const ai_helper = require("../helpers/ai_helper.js");

const chatWithAiAssistant = async (req, res, next) => {
  try {
    const message = req.query.message || "";
    const userId = req.user?.id || req.user;

    // Fetch chat history if user is logged in
    let chatHistory = [];
    let chatHistoryDoc = null;
    if (userId) {
      chatHistoryDoc = await ChatHistory.findOne({ userId, isDeleted: false });
      if (chatHistoryDoc) {
        const lastMessages = Array.isArray(chatHistoryDoc.messages)
          ? chatHistoryDoc.messages.slice(-10)
          : [];
        chatHistory = lastMessages.map(m => ({
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
      const isMyanmarText = (text) => /[\u1000-\u109F]/.test(text || "");
      const assistantUnavailableMessage = isMyanmarText(message)
        ? "AI Assistant မရရှိနိုင်သေးပါဘူး။ နောက်မှ ထပ်စမ်းကြည့်ပါ။"
        : "AI Assistant is currently unavailable.";
      return res.status(500).json({ message: assistantUnavailableMessage });
    }

    const escapeRegex = (text) => (text || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const normalizeQuery = (text) => (text || "").replace(/\s+/g, " ").trim();

    const isMyanmarText = (text) => /[\u1000-\u109F]/.test(text || "");

    const getLastUserMessageText = (history) => {
      if (!Array.isArray(history) || !history.length) return "";
      for (let i = history.length - 1; i >= 0; i--) {
        const m = history[i];
        if (m?.role === "user") {
          const parts = Array.isArray(m.parts) ? m.parts : [];
          const text = parts?.[0]?.text;
          if (typeof text === "string" && text.trim()) return text.trim();
        }
      }
      return "";
    };

    const isPurchaseFollowUp = (text) => {
      const hasPronoun = /\b(it|that|this|one|them)\b/i.test(text || "");
      const hasBuy = /\b(buy|purchase|order|checkout|get it|take it)\b/i.test(text || "");
      const hasMmBuy = /ဝယ်ချင်|အော်ဒါ|ယူချင်|ယူမယ်|ဝယ်မယ်/.test(text || "");
      return (hasPronoun && hasBuy) || hasMmBuy;
    };

    if (
      isPurchaseFollowUp(message) &&
      (!intentResponse.is_product_search || !(intentResponse.search_query || "").trim())
    ) {
      const fallbackSearchQuery = normalizeQuery(getLastUserMessageText(chatHistory));
      if (fallbackSearchQuery) {
        intentResponse.is_product_search = true;
        intentResponse.ask_about_us = false;
        intentResponse.telling_other_question = false;
        intentResponse.search_query = fallbackSearchQuery;
      }
    }

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

    const vectorThresholdForQuery = (q) => (isMyanmarText(q) ? 0.72 : 0.8);

    const buildStoreFallbackContext = (userText) => {
      const lines = [];
      const isMm = isMyanmarText(userText);

      const storeName = process.env.STORE_NAME || process.env.SHOP_NAME;
      const storeAddress = process.env.STORE_ADDRESS || process.env.SHOP_ADDRESS;
      const storeCity = process.env.STORE_CITY || process.env.SHOP_CITY;
      const storeCountry = process.env.STORE_COUNTRY || process.env.SHOP_COUNTRY;
      const storePhone = process.env.STORE_PHONE || process.env.SHOP_PHONE;
      const storeEmail = process.env.STORE_EMAIL || process.env.SHOP_EMAIL;
      const storeHours = process.env.STORE_HOURS || process.env.SHOP_HOURS;
      const storeWebsite = process.env.STORE_WEBSITE || process.env.SHOP_WEBSITE;

      if (storeName) lines.push(isMm ? `ဆိုင်အမည်: ${storeName}` : `Store Name: ${storeName}`);
      if (storeAddress) lines.push(isMm ? `လိပ်စာ: ${storeAddress}` : `Address: ${storeAddress}`);
      if (storeCity) lines.push(isMm ? `မြို့: ${storeCity}` : `City: ${storeCity}`);
      if (storeCountry) lines.push(isMm ? `နိုင်ငံ: ${storeCountry}` : `Country: ${storeCountry}`);
      if (storePhone) lines.push(isMm ? `ဖုန်း: ${storePhone}` : `Phone: ${storePhone}`);
      if (storeEmail) lines.push(isMm ? `အီးမေးလ်: ${storeEmail}` : `Email: ${storeEmail}`);
      if (storeHours) lines.push(isMm ? `ဖွင့်ချိန်: ${storeHours}` : `Hours: ${storeHours}`);
      if (storeWebsite) lines.push(isMm ? `ဝဘ်ဆိုဒ်: ${storeWebsite}` : `Website: ${storeWebsite}`);

      if (!lines.length) {
        return isMm
          ? "ဆိုင်အချက်အလက်: ဤဆိုင်သည် အွန်လိုင်းစတိုးဖြစ်ပြီး ရုံး/ဆိုင်လိပ်စာကို မဖော်ပြထားသေးပါ။ သင်လိုချင်တဲ့အကူအညီ (တည်နေရာ/ဆက်သွယ်ရေး/ပို့ဆောင်မှု) ကို ပြောပေးပါ၊ သင့်ကို အကောင်းဆုံးနည်းလမ်းနဲ့ အကြံပြုပါမယ်။"
          : "Store Information: This is an online shop and a physical address is not currently provided. Tell me what you need (location/contact/delivery) and I’ll guide you with the best option.";
      }

      return (isMm ? "ဆိုင်အချက်အလက်:\n" : "Store Information:\n") + lines.join("\n");
    };

    const mergeByHighestScore = (docs, limit) => {
      const byId = new Map();
      for (const doc of docs) {
        const id = doc?._id?.toString?.() || String(doc?._id);
        const existing = byId.get(id);
        const score = typeof doc?.score === "number" ? doc.score : 0;
        const existingScore = typeof existing?.score === "number" ? existing.score : 0;
        if (!existing || score > existingScore) {
          byId.set(id, doc);
        }
      }
      return Array.from(byId.values())
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, limit);
    };

    const searchProductsSmart = async ({ primaryQuery, secondaryQuery, limit = 5 }) => {
      const candidates = [normalizeQuery(primaryQuery), normalizeQuery(secondaryQuery)].filter(Boolean);
      const uniqueCandidates = [...new Set(candidates)];

      let vectorResults = [];
      for (const q of uniqueCandidates) {
        const vectorResponse = await ai_helper.generateVectorDataForSearch({ prompt: q });
        if (!vectorResponse) continue;

        const queryVector = vectorResponse.vector_data;
        const threshold = vectorThresholdForQuery(q);
        const found = await Product.aggregate([
          {
            $vectorSearch: {
              index: "vector_index",
              path: "vector_data",
              queryVector: queryVector,
              numCandidates: 200,
              limit: limit,
            },
          },
          {
            $addFields: {
              score: { $meta: "vectorSearchScore" },
            },
          },
          {
            $match: {
              score: { $gte: threshold }
            }
          }
        ]);
        vectorResults = vectorResults.concat(found);
      }

      const mergedVectorResults = mergeByHighestScore(vectorResults, limit);
      if (mergedVectorResults.length) return mergedVectorResults;

      const primary = normalizeQuery(primaryQuery);
      if (primary) {
        const textFound = await Product.find(
          { $text: { $search: primary } },
          { score: { $meta: "textScore" } }
        ).sort({ score: { $meta: "textScore" } }).limit(limit);

        if (textFound.length) return textFound;
      }

      for (const q of uniqueCandidates) {
        const trimmed = normalizeQuery(q);
        if (!trimmed) continue;

        const tokens = trimmed.split(/\s+/).filter(Boolean);
        const tokenPattern = tokens.map(escapeRegex).join("|");
        const fullRegex = new RegExp(escapeRegex(trimmed), "i");
        const tokenRegex = tokenPattern ? new RegExp(tokenPattern, "i") : null;

        const or = [
          { name: fullRegex },
          { description: fullRegex },
        ];

        if (tokenRegex) {
          or.push({ name: tokenRegex }, { description: tokenRegex });
        }

        const regexFound = await Product.find({ $or: or }).limit(limit);
        if (regexFound.length) return regexFound;
      }

      return [];
    };

    // ၀။ Recommend ပေးတဲ့အပိုင်း
    if (intentResponse.is_recommend_request === true) {
      let products = [];

      if ((intentResponse.search_query || "").trim()) {
        products = await searchProductsSmart({
          primaryQuery: intentResponse.search_query,
          secondaryQuery: message,
          limit: 5
        });
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

      const faqThreshold = isMyanmarText(message) ? 0.75 : 0.8;

      let contextDocs = [];
      if (vectorResponse && vectorResponse.vector_data) {
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
              score: { $gte: faqThreshold }
            }
          }
        ]);
        contextDocs = faqResults;
      }

      if (!contextDocs.length) {
        const tokens = normalizeQuery(message).split(/\s+/).filter(Boolean).slice(0, 6);
        if (tokens.length) {
          const regex = new RegExp(tokens.map(escapeRegex).join("|"), "i");
          const textMatches = await Faq.find({ $or: [{ question: regex }, { answer: regex }] }).limit(3);
          contextDocs = textMatches;
        }
      }

      if (contextDocs.length > 0) {
        const context = contextDocs
          .map((f) => `Question: ${f.question} Answer: ${f.answer}`)
          .join("\n");
        const finalAiAnswer = await ai_helper.generateFinalResponse({
          userPrompt: message,
          context: context,
          chatHistory: chatHistory
        });
        const safeAnswer = finalAiAnswer || (isMyanmarText(message)
          ? "ဒီမေးခွန်းအတွက် အဖြေကို ပြန်စစ်ပြီးပေးပါမယ်။ ဆိုင်အကြောင်းအရာ/ဆက်သွယ်ရေး/ပို့ဆောင်မှုအကြောင်း အသေးစိတ်နည်းနည်း ထပ်ပြောပေးပါ။"
          : "I can help with that—please share a bit more detail (location/contact/delivery) and I’ll answer accurately.");
        await updateChatHistory(message, safeAnswer);
        return res.json({
          type: "faq",
          message: safeAnswer
        });
      }

      const fallbackContext = buildStoreFallbackContext(message);
      const fallbackAnswer = await ai_helper.generateFinalResponse({
        userPrompt: message,
        context: fallbackContext,
        chatHistory: chatHistory
      });
      const safeFallbackAnswer = fallbackAnswer || (isMyanmarText(message)
        ? "ဤမေးခွန်းအတွက် အချက်အလက်မလုံလောက်သေးပါ။ ဆိုင်တည်နေရာ/ဆက်သွယ်ရေးအချက်အလက်လိုတာလား၊ ဒါမှမဟုတ် ပို့ဆောင်မှုအကြောင်း သိချင်တာလား ပြောပေးပါ။"
        : "I don’t have enough stored info for that yet. Do you mean store location, contact details, or delivery information?");
      await updateChatHistory(message, safeFallbackAnswer);
      try {
        await UnansweredQuestion.create({
          question: message,
          intent: "faq"
        });
      } catch (saveError) {
        console.error("Error saving unanswered FAQ question:", saveError);
      }
      return res.json({
        type: "faq",
        message: safeFallbackAnswer
      });
    }

    // ၂။ Product ရှာတဲ့အပိုင်း (အနီးစပ်ဆုံး ၅ ခု)
    if (intentResponse.is_product_search === true) {
      const searchTerm = normalizeQuery(intentResponse.search_query || message);
      const products = await searchProductsSmart({
        primaryQuery: searchTerm,
        secondaryQuery: message,
        limit: 5
      });

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
      const notFoundMessage = await ai_helper.generateNotFoundResponse({
        userPrompt: message,
        type: "products",
        chatHistory: chatHistory
      });
      await updateChatHistory(message, notFoundMessage);
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
        message: notFoundMessage
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
