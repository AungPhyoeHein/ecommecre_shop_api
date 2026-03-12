const { GoogleGenerativeAI, TaskType } = require('@google/generative-ai');
require('dotenv').config();

// API Key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const classifyIntent = async (prompt) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });
    const classificationPrompt = `
      Analyze the user input and determine their intent.
      
      Rules for classification:
      1. is_product_search: Set to true if the user specifically mentions a product name, category, or features they want to buy (e.g., "find me a car", "macbook", "iphone").
      2. ask_about_us: Set to true if the user asks about the shop's physical details like location, address, phone number, email, opening hours, or company history.
      3. telling_other_question: Set to true for general greetings ("hi", "hello"), asking who you are ("who are you?"), asking about your feelings ("how are you?"), or any topic NOT related to buying products or shop logistics.
      
      Return ONLY a JSON object with these fields:
          {
            "is_product_search": boolean,
            "ask_about_us": boolean,
            "telling_other_question": boolean,
            "search_query": "string" (A concise English search term. For products, use ONLY the specific product name or category. Leave empty if not searching.)
          }
      
      User Input: "${prompt}"
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
        is_product_search: false,
        ask_about_us: false,
        telling_other_question: true,
        search_query: ""
      };
    }

    // Get response text
    let responseText = "";
    const chatModel = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });
    let chatPrompt = "";
    
    if (intent.telling_other_question) {
      chatPrompt = `
        You are a friendly customer service assistant for an e-commerce shop. 
        User says: "${prompt}"
        Respond politely in the SAME language as the user (If user speaks Burmese, respond in Burmese only. If user speaks English, respond in English only). Keep it brief.
        Return ONLY a JSON object with a single "response" field:
        { "response": "Your response here" }
      `;
    } else if (intent.is_product_search) {
      chatPrompt = `
        You are a friendly customer service assistant. The user is looking for products: "${prompt}".
        Give a very brief, helpful response in the SAME language as the user.
        Return ONLY a JSON object: { "response": "Your response here" }
      `;
    } else if (intent.ask_about_us) {
      chatPrompt = `
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

const generateFinalResponse = async ({ userPrompt, context }) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });
    const prompt = `
      You are a helpful customer service assistant for our e-commerce shop.
      Based on the following FAQ information, answer the user's question accurately and politely.
      
      IMPORTANT: Respond in the SAME language as the user's question. 
      If user asks in Burmese, respond in Burmese only. 
      If user asks in English, respond in English only.
      
      FAQ Context:
      ${context}
      
      User Question: "${userPrompt}"
      
      Answer:
    `;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error("Final Response Error:", error);
    return "I'm sorry, I'm having trouble answering that right now.";
  }
};

const generateNotFoundResponse = async ({ userPrompt, type }) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });
    const prompt = `
      You are a friendly customer service assistant for an e-commerce shop.
      The user asked: "${userPrompt}"
      We searched our ${type === 'products' ? 'product catalog' : 'store information'} but couldn't find anything matching their request.
      
      IMPORTANT: Respond in the SAME language as the user's question. 
      If user speaks Burmese, respond in Burmese only. 
      If user speaks English, respond in English only.
      Keep it friendly and professional.
      
      Response:
    `;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error("Not Found Response Error:", error);
    return type === 'products' 
      ? "ရှာဖွေနေတဲ့ ပစ္စည်းနဲ့ ဆင်တူတဲ့ ပစ္စည်း မတွေ့ပါဘူးဗျာ။ (There is no product similar to that product)"
      : "ကျွန်တော်တို့ ဆိုင်နဲ့ပတ်သက်တဲ့ ဒီအချက်အလက်ကို မတွေ့ပါဘူးဗျာ။ (No similar information found about us)";
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

module.exports = {
  classifyIntent,
  generateVectorDataForSearch,
  generateVectorDataForAddProduct,
  generateFinalResponse,
  generateNotFoundResponse,
};