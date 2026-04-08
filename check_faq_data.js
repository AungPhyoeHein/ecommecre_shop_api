
const mongoose = require('mongoose');
const { Faq } = require('./models/index');
require('dotenv').config();

async function checkFaqData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.DB_URL);
    console.log('Connected.');

    const faqs = await Faq.find({});
    console.log(`\nFound ${faqs.length} FAQs in database.`);
    faqs.forEach(f => {
      console.log(`- Q: ${f.question} | Vector length: ${f.vector_data ? f.vector_data.length : 'N/A'}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Check Error:', error);
    process.exit(1);
  }
}

checkFaqData();
