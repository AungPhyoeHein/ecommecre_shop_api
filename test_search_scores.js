
const mongoose = require('mongoose');
const { Product } = require('./models/index');
const ai_helper = require('./helpers/ai_helper');
require('dotenv').config();

async function testVectorSearch() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.DB_URL);
    console.log('Connected.');

    const query = "laptop";
    console.log(`Generating vector for query: "${query}"...`);
    
    const vectorResponse = await ai_helper.generateVectorDataForSearch({ prompt: query });
    if (!vectorResponse || !vectorResponse.vector_data) {
      console.error("Failed to generate vector.");
      process.exit(1);
    }

    console.log(`Vector generated (Length: ${vectorResponse.vector_data.length}). Searching...`);

    const products = await Product.aggregate([
      {
        $vectorSearch: {
          index: "vector_index",
          path: "vector_data",
          queryVector: vectorResponse.vector_data,
          numCandidates: 100,
          limit: 5,
        },
      },
      {
        $addFields: {
          score: { $meta: "vectorSearchScore" },
        },
      }
    ]);

    console.log(`Found ${products.length} products total (before threshold).`);
    products.forEach(p => {
      console.log(`- ${p.name}: Score = ${p.score}`);
    });

    const threshold = 0.95;
    const filtered = products.filter(p => p.score >= threshold);
    console.log(`\nProducts with score >= ${threshold}: ${filtered.length}`);
    filtered.forEach(p => {
      console.log(`- ${p.name}: Score = ${p.score}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Test Error:', error);
    process.exit(1);
  }
}

testVectorSearch();
