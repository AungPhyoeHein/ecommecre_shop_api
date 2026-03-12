
const mongoose = require('mongoose');
const { Product, Faq, Category } = require('./models');
const ai_helper = require('./helpers/ai_helper');
require('dotenv').config();

const updateVectors = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.DB_URL);
    console.log('Connected to MongoDB');

    // 1. Update Product Vectors
    console.log('Updating Product vectors...');
    const products = await Product.find({}).populate('category');
    for (const product of products) {
      console.log(`Generating vector for product: ${product.name}`);
      const productInfo = {
        ...product.toObject(),
        categoryName: product.category ? product.category.name : ''
      };
      const aiResult = await ai_helper.generateVectorDataForAddProduct(productInfo);
      if (aiResult && aiResult.vector_data && aiResult.vector_data.length > 0) {
        product.vector_data = aiResult.vector_data;
        product.aiStatus = 'completed';
        await product.save();
        console.log(`Successfully updated vector for: ${product.name}`);
      } else {
        console.warn(`Failed to generate vector for product: ${product.name}`);
      }
    }

    // 2. Update FAQ Vectors
    console.log('Updating FAQ vectors...');
    const faqs = await Faq.find({});
    for (const faq of faqs) {
      console.log(`Generating vector for FAQ: ${faq.question}`);
      const aiResponse = await ai_helper.generateVectorDataForSearch({ prompt: faq.question });
      if (aiResponse && aiResponse.vector_data && aiResponse.vector_data.length > 0) {
        faq.vector_data = aiResponse.vector_data;
        await faq.save();
        console.log(`Successfully updated vector for FAQ: ${faq.question}`);
      } else {
        console.warn(`Failed to generate vector for FAQ: ${faq.question}`);
      }
    }

    console.log('All vectors updated successfully using gemini-embedding-001');
    process.exit(0);
  } catch (error) {
    console.error('Error updating vectors:', error);
    process.exit(1);
  }
};

updateVectors();
