const { GoogleGenerativeAI, TaskType } = require('@google/generative-ai');
require('dotenv').config();

// API Key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const classifyIntent = async (prompt, chatHistory = []) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });
    
    // Prepare history context for intent classification
    const historyContext = chatHistory.length > 0 
      ? `Recent Conversation History:\n${chatHistory.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.parts[0].text}`).join('\n')}\n\n`
      : '';

    const classificationPrompt = `
      ${historyContext}
      Analyze the user input and determine their intent.
      
      Rules for classification:
      0. is_recommend_request: Set to true if the user asks for recommendations/suggestions/best picks/popular items (e.g., "recommend me something", "what should I buy?", "best shoes", "recommend").
      1. is_product_search: Set to true if the user mentions a product name, category, or features they want to buy or look for (e.g., "find me a car", "macbook", "iphone"). ALSO set to true if the user is following up to buy/get a previously discussed item (e.g., "I want to buy it", "ဝယ်ချင်တယ်", "ယူမယ်"). In this case, infer the "search_query" from the chat history.
      2. ask_about_us: Set to true if the user asks ANY question related to the store, its services, or its policies. This includes:
         - Physical details (location, address, phone, email, opening hours).
         - Store history, general "about us" info.
         - Store policies (refunds, delivery, payments, returns).
         - Facilities or services (parking, branches, gift wrapping).
         - Questions like "who are you?", "what is this shop?", "where are you located?".
      3. telling_other_question: Set to true ONLY for general greetings ("hi", "hello"), asking about your feelings ("how are you?"), or topics COMPLETELY UNRELATED to the store, its products, or its operations. If you are in doubt, prefer setting ask_about_us to true if it mentions anything that could be store-related.
      
      Return ONLY a JSON object with these fields:
          {
            "is_recommend_request": boolean,
            "is_product_search": boolean,
            "ask_about_us": boolean,
            "telling_other_question": boolean,
            "search_query": "string" (A concise English search term. For products, use ONLY the specific product name or category. If they say "buy it", use the product name from history. Leave empty if not searching.)
          }
      
      User Input: "${prompt}"
      
      IMPORTANT: The user input might be in English or Burmese. Analyze the intent regardless of the language.
    `;

    const result = await model.generateContent(classificationPrompt);
    let aiText = result.response.text().trim();
    aiText = aiText.replace(/```json/g, "").replace(/```/g, "").trim();
    
    let intent;
    try {
      intent = JSON.parse(aiText);
    } catch (parseError) {
      console.error("JSON Parse Error for Intent:", parseError);
      intent = {
        is_recommend_request: false,
        is_product_search: false,
        ask_about_us: false,
        telling_other_question: true,
        search_query: ""
      };
    }

    // Get response text
    let responseText = "";
    const chatModel = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });
    
    // Prepare history context for general chat
    const historyContextChat = chatHistory.length > 0 
      ? `Recent Conversation History:\n${chatHistory.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.parts[0].text}`).join('\n')}\n\n`
      : '';

    let chatPrompt = "";
    
    if (intent.telling_other_question) {
      chatPrompt = `
        ${historyContextChat}
        You are a friendly customer service assistant for an e-commerce shop. 
        User says: "${prompt}"
        Respond politely in the SAME language as the user (If user speaks Burmese, respond in Burmese only. If user speaks English, respond in English only). Keep it brief.
        Return ONLY a JSON object with a single "response" field:
        { "response": "Your response here" }
      `;
    } else if (intent.is_recommend_request) {
      chatPrompt = `
        ${historyContextChat}
        You are a friendly sales assistant for an e-commerce shop.
        The user is asking for recommendations: "${prompt}".
        Respond in the SAME language as the user with 1-2 short sentences to introduce the recommendations.
        Return ONLY a JSON object: { "response": "Your response here" }
      `;
    } else if (intent.is_product_search) {
      chatPrompt = `
        ${historyContextChat}
        You are a friendly customer service assistant. The user is looking for products: "${prompt}".
        Give a very brief, helpful response in the SAME language as the user.
        Return ONLY a JSON object: { "response": "Your response here" }
      `;
    } else if (intent.ask_about_us) {
      chatPrompt = `
        ${historyContextChat}
        You are a friendly customer service assistant. The user is asking about the shop: "${prompt}".
        Give a very brief, helpful response in the SAME language as the user.
        Return ONLY a JSON object: { "response": "Your response here" }
      `;
    }

    if (chatPrompt) {
      const chatResult = await chatModel.generateContent(chatPrompt);
      let chatResponse = chatResult.response.text();
      chatResponse = chatResponse.replace(/```json/g, "").replace(/```/g, "").trim();
      try {
        const parsedChat = JSON.parse(chatResponse);
        responseText = parsedChat.response || chatResponse;
      } catch (e) {
        responseText = chatResponse;
      }
    }

    return { ...intent, response_text: responseText };
  } catch (error) {
    console.error("Classify Intent Error:", error);
    return {
      is_recommend_request: false,
      is_product_search: false,
      ask_about_us: false,
      telling_other_question: true,
      search_query: "",
      response_text: "I'm sorry, I'm having trouble processing your request right now."
    };
  }
};

const generateVectorDataForSearch = async ({ prompt }) => {
  if (!prompt) {
    console.error("Error: prompt is missing!");
    return null;
  }

  try {
    const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    const embeddingResult = await embeddingModel.embedContent({
      content: { parts: [{ text: prompt }] },
      taskType: TaskType.RETRIEVAL_QUERY,
      outputDimensionality: 768,
    });

    return {
      vector_data: embeddingResult.embedding.values
    };
  } catch (error) {
    console.error("Vector Search Error:", error);
    return null;
  }
};

const generateFinalResponse = async ({ userPrompt, context, chatHistory = [] }) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });
    
    // Prepare history context for conversation
    const historyContext = chatHistory.length > 0 
      ? `Recent Conversation History:\n${chatHistory.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.parts[0].text}`).join('\n')}\n\n`
      : '';

    const prompt = `
      ${historyContext}
      You are a friendly customer service assistant for an e-commerce shop.
      Use the following context to answer the user's question.
      
      Context:
      ${context}
      
      User Question: "${userPrompt}"
      
      Rules:
      1. ONLY use the provided context to answer. If the answer is not in the context, say you don't know politely.
      2. Respond in the SAME language as the user's question (If user speaks Burmese, respond in Burmese only. If user speaks English, respond in English only).
      3. Keep the tone helpful, professional, and friendly.
      4. Use the conversation history to maintain context if the user's current question refers to previous topics.
      
      Response:
    `;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error("Generate Final Response Error:", error);
    return "I'm sorry, I'm having trouble answering that right now.";
  }
};

const generateNotFoundResponse = async ({ userPrompt, type, chatHistory = [] }) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });
    
    // Prepare history context for conversation
    const historyContext = chatHistory.length > 0 
      ? `Recent Conversation History:\n${chatHistory.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.parts[0].text}`).join('\n')}\n\n`
      : '';

    const prompt = `
      ${historyContext}
      You are a friendly customer service assistant for an e-commerce shop.
      The user is looking for something we couldn't find in our records.
      
      User Search: "${userPrompt}"
      Search Type: ${type}
      
      Rules:
      1. Politely explain that we couldn't find specific information about this right now.
      2. If it's a product, suggest they check back later or contact support.
      3. If it's an FAQ/About Us question, tell them an administrator will review their question.
      4. Respond in the SAME language as the user's question.
      5. Keep it brief (1-2 sentences).
      6. Use the conversation history to maintain context if the user's current question refers to previous topics.
      
      Response:
    `;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error("Generate Not Found Response Error:", error);
    return "ရှာဖွေနေတဲ့ အချက်အလက်ကို မတွေ့ရှိပါဘူးဗျာ။ (Couldn't find the information you're looking for)";
  }
};

const generateProductFoundResponse = async ({ userPrompt, products, chatHistory = [] }) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });
    
    // Prepare history context for conversation
    const historyContext = chatHistory.length > 0 
      ? `Recent Conversation History:\n${chatHistory.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.parts[0].text}`).join('\n')}\n\n`
      : '';

    const productContext = products.map(p => 
      `Name: ${p.name}, Price: ${p.price}, Description: ${p.description}, Sizes: ${p.sizes ? p.sizes.join(", ") : 'N/A'}`
    ).join("\n\n");

    const prompt = `
      ${historyContext}
      You are a friendly and persuasive sales assistant for an e-commerce shop.
      The user is searching for: "${userPrompt}"
      We found the following products that match their search.
      
      Products:
      ${productContext}
      
      Your goal is to tell the user that you've found these products and explain briefly why they should consider buying or looking at them based on their search.
      
      IMPORTANT: 
      1. Be persuasive but helpful. Highlight a key feature or reason why these products are a good choice.
      2. Respond in the SAME language as the user's question (If Burmese, respond in Burmese; if English, respond in English).
      3. Do NOT list all the product details again (they are shown separately), just provide a cohesive and motivating response.
      4. Keep it concise (2-3 sentences).
      5. Use the conversation history to maintain context if the user's current question refers to previous topics.
      
      Response:
    `;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error("Product Found Response Error:", error);
    return "ရှာဖွေနေတဲ့ ပစ္စည်းတွေကို တွေ့ရှိထားပါတယ်ဗျာ။ ဒီပစ္စည်းတွေက သင့်အတွက် အဆင်ပြေစေမှာပါ (Found the products you're looking for, these would be great for you!)";
  }
};

const generateVectorDataForAddProduct = async (productInfo) => {
  if (!productInfo) {
    console.error("Error: productInfo is missing!");
    return null;
  }
  
  try {
    const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    
    const attributes = [];
    if (productInfo.name) attributes.push(`Name: ${productInfo.name}`);
    if (productInfo.description) attributes.push(`Description: ${productInfo.description}`);
    if (productInfo.categoryName) attributes.push(`Category: ${productInfo.categoryName}`);
    if (productInfo.price) attributes.push(`Price: ${productInfo.price}`);
    if (productInfo.genderAgeCategory) attributes.push(`Target Audience: ${productInfo.genderAgeCategory}`);
    if (productInfo.colors && productInfo.colors.length > 0) attributes.push(`Colors: ${productInfo.colors.join(", ")}`);
    if (productInfo.sizes && productInfo.sizes.length > 0) attributes.push(`Sizes: ${productInfo.sizes.join(", ")}`);

    const textToEmbed = attributes.join(". ");
    
    if (!textToEmbed) {
      console.warn("Warning: No product attributes to embed.");
      return { vector_data: [] };
    }

    const embeddingResult = await embeddingModel.embedContent({
      content: { parts: [{ text: textToEmbed }] },
      taskType: TaskType.RETRIEVAL_DOCUMENT,
      outputDimensionality: 768,
    });
    
    return {
      vector_data: embeddingResult.embedding.values
    };
  } catch (error) {
    console.error("Add Product Vector Error:", error);
    return null;
  }
};

const filterIrrelevantProducts = async (userPrompt, products) => {
  if (!products || products.length === 0) return [];
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });
    
    const productContext = products.map(p => 
      `ID: "${p._id.toString()}", Name: "${p.name}", Description: "${p.description}"`
    ).join("\n");

    const prompt = `
      The user is searching for: "${userPrompt}".
      We have the following products retrieved from our database:
      
      ${productContext}
      
      Your task is to determine which of these products are ACTUALLY relevant to the user's search.
      For example, if the user searches for a "car", an "iPhone" is NOT relevant.
      If the user searches for "shoes", "pants" are NOT relevant.
      
      Return ONLY a JSON array containing the string IDs of the relevant products. 
      If none are relevant, return an empty array [].
      Do not include any other text, just the JSON array.
    `;

    const result = await model.generateContent(prompt);
    let aiText = result.response.text().trim();
    aiText = aiText.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const relevantIds = JSON.parse(aiText);
    if (!Array.isArray(relevantIds)) {
      console.error("Filter returned non-array:", relevantIds);
      return products; // fallback
    }
    
    return products.filter(p => relevantIds.includes(p._id.toString()));
  } catch (error) {
    console.error("Filter Irrelevant Products Error:", error);
    return products; // On error, return original products
  }
};

const generateGeneralRecommendation = async ({ userPrompt, chatHistory = [] }) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });
    
    const historyContext = chatHistory.length > 0 
      ? `Recent Conversation History:\n${chatHistory.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.parts[0].text}`).join('\n')}\n\n`
      : '';

    const prompt = `
      ${historyContext}
      You are a friendly and helpful sales assistant for an e-commerce shop.
      The user is asking for advice or a recommendation: "${userPrompt}"
      
      Your task:
      1. Provide a helpful, general recommendation or advice based on their request.
      2. If they ask for specific specs or types of items (e.g. for gaming, for a specific use case), give them good advice.
      3. Encourage them to search our store for products matching these recommendations.
      4. Respond in the SAME language as the user's question (If Burmese, respond in Burmese; if English, respond in English).
      5. Keep it friendly and concise (2-3 sentences).
      
      Response:
    `;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error("General Recommendation Error:", error);
    return "အကြံပြုပေးချင်ပေမယ့် အခုလောလောဆယ် အကြောင်းအရာကို သေချာမသိသေးပါဘူးဗျာ။ (I'd love to give a recommendation, but I'm having trouble processing that right now.)";
  }
};

module.exports = {
  classifyIntent,
  generateVectorDataForSearch,
  generateVectorDataForAddProduct,
  generateFinalResponse,
  generateNotFoundResponse,
  generateProductFoundResponse,
  filterIrrelevantProducts,
  generateGeneralRecommendation,
};
