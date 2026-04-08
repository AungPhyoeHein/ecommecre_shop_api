
const mongoose = require('mongoose');
const { Faq } = require('./models/index');
const ai_helper = require('./helpers/ai_helper');
require('dotenv').config();

async function testFaqSearch() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.DB_URL);
    console.log('Connected.');

    const userMessage = "Where is your shop located?";
    console.log(`\n1. Testing Intent Classification for: "${userMessage}"`);
    const intent = await ai_helper.classifyIntent(userMessage);
    console.log('Intent Result:', JSON.stringify(intent, null, 2));

    const query = userMessage; // Use full message instead of intent.search_query
    console.log(`\n2. Generating vector for query: "${query}"...`);
    
    const vectorResponse = await ai_helper.generateVectorDataForSearch({ prompt: query });
    if (!vectorResponse || !vectorResponse.vector_data) {
      console.error("Failed to generate vector.");
      process.exit(1);
    }

    console.log(`Vector generated (Length: ${vectorResponse.vector_data.length}). Searching FAQ...`);

    const faqs = await Faq.aggregate([
      {
        $vectorSearch: {
          index: "faq_vector_index",
          path: "vector_data",
          queryVector: vectorResponse.vector_data,
          numCandidates: 50,
          limit: 3,
        },
      },
      {
        $addFields: {
          score: { $meta: "vectorSearchScore" },
        },
      }
    ]);

    console.log(`\nFound ${faqs.length} FAQs total (before threshold).`);
    faqs.forEach(f => {
      console.log(`- Q: ${f.question} | Score: ${f.score}`);
    });

    const threshold = 0.6;
    const filtered = faqs.filter(f => f.score >= threshold);
    console.log(`\nFAQs with score >= ${threshold}: ${filtered.length}`);
    filtered.forEach(f => {
      console.log(`- Q: ${f.question} | Score: ${f.score}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Test Error:', error);
    process.exit(1);
  }
}

testFaqSearch();
