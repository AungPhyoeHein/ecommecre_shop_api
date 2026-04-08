require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testKey() {
  const key = process.env.GEMINI_API_KEY;
  console.log("Using API Key:", key ? (key.substring(0, 5) + "...") : "MISSING");
  
  if (!key) {
    console.error("Error: GEMINI_API_KEY is not set in .env");
    return;
  }

  const genAI = new GoogleGenerativeAI(key);
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });
    const result = await model.generateContent("Say hello");
    console.log("Success! AI Response:", result.response.text());
  } catch (error) {
    console.error("API Key Test Failed!");
    console.error("Error Name:", error.name);
    console.error("Error Message:", error.message);
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Status Text:", error.response.statusText);
    }
  }
}

testKey();
