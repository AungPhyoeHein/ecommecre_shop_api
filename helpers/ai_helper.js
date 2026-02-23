const { puter } = require("@heyputer/puter.js");
puter.setAuthToken(
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0IjoicyIsInYiOiIwLjAuMCIsInUiOiJoL2xrTVVhN1ExYXNjOXcrZ3Q4Vm5RPT0iLCJ1dSI6InlCS0xhZmUrVHY2bEU4THBkR3pMenc9PSIsImlhdCI6MTc2NzE1MTAwM30.XTWvI6WsaLdW1r7hyy_Z3Y43Urrc74Ns0FVGdIQ01b8",
);

const generateVectorDataForSearch = async ({ prompt }) => {
  try {
    const response = await puter.ai.chat(
      `You are an AI middleware that prepares search queries for a vector database.
       Analyze user intent and return ONLY JSON.
       Convert user input into a 768-dimension vector array. 
             Return ONLY a flat JSON array of numbers.n/ 
       JSON Format:
       {
         "is_product_search": boolean,
         "ask_about_us": boolean,
         "telling_other_question": boolean,
         "vector_data": [array of numbers],
         "response_text": "optimized search string"
       }
       
       User Input: "${prompt}"`,
      { model: "gpt-5-nano" },
    );

    return JSON.parse(response);
  } catch (error) {
    console.error("Vector Search Error:", error);
    return null;
  }
};

const generateVectorDataForAddProduct = async (productInfo) => {
  if (!productInfo) {
    console.error("Error: productInfo is missing!");
    return null;
  }
  productInfo = JSON.stringify(productInfo);
  try {
    const response = await puter.ai.chat(
      `You are an expert Product Analyst. 
       Research this product online for specs and use cases.
       Return ONLY JSON.
       Convert user input into a 768-dimension vector array. 
             Return ONLY a flat JSON array of numbers.
       Format:
       {
        "ai_analysis_summary": "detailed  technical research(important: don't add \n or next line break)"
         "vector_data": [array of numbers],
       }
       
       User Input: "${productInfo}"`,
      { model: "gpt-5-nano" },
    );
    console.log(response);
    const aiText = response.message.content;
    console.log(aiText);
    try {
      let jsonString = aiText;
      // AI responses can be wrapped in markdown. Let's extract the JSON.
      const markdownMatch = jsonString.match(/```json\n([\s\S]*)\n```/);
      if (markdownMatch && markdownMatch[1]) {
        jsonString = markdownMatch[1];
      }

      // Find the boundaries of the JSON object.
      const startIndex = jsonString.indexOf("{");
      const endIndex = jsonString.lastIndexOf("}");
      if (startIndex === -1 || endIndex === -1) {
        throw new Error("Could not find a JSON object in the response.");
      }
      jsonString = jsonString.substring(startIndex, endIndex + 1);

      return JSON.parse(jsonString);
    } catch (e) {
      console.error("Parsing Error:", e.message);
      console.error("--- AI Response Start ---");
      console.error(aiText);
      console.error("--- AI Response End ---");
      return null;
    }
  } catch (error) {
    console.error("Add Product Vector Error:", error);
    return null;
  }
};

module.exports = {
  generateVectorDataForSearch,
  generateVectorDataForAddProduct,
};