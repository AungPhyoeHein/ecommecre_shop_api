const { GoogleGenerativeAI } = require('@google/generative-ai');

// API Key ထည့်ပါ
const genAI = new GoogleGenerativeAI('AIzaSyChehNYEEqSdmfhv2oYGV7HEtZFfi_62Ok');

const generateVectorDataForSearch = async ({ prompt }) => {
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
            "search_query": "string" (A concise English search term like "car", "macbook pro", "contact info". Leave empty if not searching. For product searches, use specific terms that describe the product exactly.)
          }
      
      User Input: "${prompt}"
    `;

    const result = await model.generateContent(classificationPrompt);
    let aiText = result.response.text().trim();
    console.log("Raw AI Classification Response:", aiText);
    
    // Clean up JSON response from AI
    aiText = aiText.replace(/```json/g, "").replace(/```/g, "").trim();
    console.log("Cleaned AI Classification JSON:", aiText);
    
    let intent;
    try {
      intent = JSON.parse(aiText);
    } catch (parseError) {
      console.error("JSON Parse Error for Intent:", parseError);
      // Fallback intent if AI fails to return valid JSON
      intent = {
        is_product_search: false,
        ask_about_us: false,
        telling_other_question: true,
        search_query: ""
      };
    }

    // If it's a search or about us, we need vector data
    let vectorData = [];
    if (intent.is_product_search || intent.ask_about_us) {
      const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
      const embeddingResult = await embeddingModel.embedContent({
        content: { parts: [{ text: intent.search_query || prompt }] },
        outputDimensionality: 768,
      });
      vectorData = embeddingResult.embedding.values;
    }

    // Always get a response text for products or ask_about_us intents
    let responseText = "";
    if (intent.telling_other_question || intent.is_product_search || intent.ask_about_us) {
      const chatModel = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });
      let chatPrompt = "";
      
      if (intent.telling_other_question) {
        chatPrompt = `
          You are a friendly customer service assistant for an e-commerce shop. 
          User says: "${prompt}"
          Respond politely. Keep it brief.
          Return ONLY a JSON object with a single "response" field:
          { "response": "Your response here" }
        `;
      } else if (intent.is_product_search) {
        chatPrompt = `
          You are a friendly customer service assistant. The user is looking for products: "${prompt}".
          Give a very brief, helpful response like "Let me find those products for you!" or "Searching for your items now...".
          Return ONLY a JSON object: { "response": "Your response here" }
        `;
      } else if (intent.ask_about_us) {
        chatPrompt = `
          You are a friendly customer service assistant. The user is asking about the shop: "${prompt}".
          Give a very brief, helpful response like "Let me check our store information for you!" or "Checking that for you now...".
          Return ONLY a JSON object: { "response": "Your response here" }
        `;
      }

      const chatResult = await chatModel.generateContent(chatPrompt);
      let chatResponse = chatResult.response.text();
      console.log("Raw AI Chat Response:", chatResponse);
      chatResponse = chatResponse.replace(/```json/g, "").replace(/```/g, "").trim();
      console.log("Cleaned AI Response Text:", chatResponse);
      try {
        const parsedChat = JSON.parse(chatResponse);
        responseText = parsedChat.response || chatResponse;
      } catch (e) {
        console.error("JSON Parse Error for Response Text:", e);
        responseText = chatResponse;
      }
    }

    return {
      ...intent,
      vector_data: vectorData,
      response_text: responseText
    };
  } catch (error) {
    console.error("Vector Search Error:", error);
    // Return a structured error response instead of null
    return {
      is_product_search: false,
      ask_about_us: false,
      telling_other_question: true,
      search_query: "",
      vector_data: [],
      response_text: "I'm sorry, I'm having trouble processing your request right now. How can I help you with our products?"
    };
  }
};

const generateFinalResponse = async ({ userPrompt, context }) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });
    const prompt = `
      You are a helpful customer service assistant for our e-commerce shop.
      Based on the following FAQ information, answer the user's question accurately and politely.
      
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
  generateVectorDataForSearch,
  generateVectorDataForAddProduct,
  generateFinalResponse,
};
