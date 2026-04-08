
const mongoose = require('mongoose');
const { Product, Faq, Category } = require('./models/index');
const ai_helper = require('./helpers/ai_helper');
const { TaskType, GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function generateFaqVector(faq) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
  const textToEmbed = `Question: ${faq.question} Answer: ${faq.answer}`;
  
  const result = await embeddingModel.embedContent({
    content: { parts: [{ text: textToEmbed }] },
    taskType: TaskType.RETRIEVAL_DOCUMENT,
    outputDimensionality: 768,
  });
  
  return result.embedding.values;
}

const dummyCategories = [
  { name: 'Laptops', image: 'https://example.com/laptops.jpg', color: '#3498db' },
  { name: 'Smartphones', image: 'https://example.com/phones.jpg', color: '#2ecc71' },
  { name: 'Accessories', image: 'https://example.com/acc.jpg', color: '#e74c3c' }
];

const dummyProducts = [
  {
    name: 'MacBook Pro 16',
    description: 'Powerful laptop with M3 Max chip, 32GB RAM, 1TB SSD.',
    price: 2499,
    image: 'https://example.com/macbook.jpg',
    categoryName: 'Laptops',
    genderAgeCategory: 'unisex',
    countInStock: 10,
    colors: ['Space Gray', 'Silver'],
    sizes: ['16-inch']
  },
  {
    name: 'Dell XPS 15',
    description: 'Premium Windows laptop with 4K OLED display and RTX 4060.',
    price: 1899,
    image: 'https://example.com/dellxps.jpg',
    categoryName: 'Laptops',
    genderAgeCategory: 'unisex',
    countInStock: 5,
    colors: ['Platinum Silver'],
    sizes: ['15-inch']
  },
  {
    name: 'iPhone 15 Pro',
    description: 'Titanium design, A17 Pro chip, Pro camera system.',
    price: 999,
    image: 'https://example.com/iphone15.jpg',
    categoryName: 'Smartphones',
    genderAgeCategory: 'unisex',
    countInStock: 20,
    colors: ['Natural Titanium', 'Blue Titanium'],
    sizes: ['128GB', '256GB', '512GB']
  },
  {
    name: 'Samsung Galaxy S24 Ultra',
    description: 'Ultimate Android phone with S Pen and 200MP camera.',
    price: 1299,
    image: 'https://example.com/s24ultra.jpg',
    categoryName: 'Smartphones',
    genderAgeCategory: 'unisex',
    countInStock: 15,
    colors: ['Titanium Gray', 'Titanium Black'],
    sizes: ['256GB', '512GB']
  }
];

const dummyFaqs = [
  {
    question: 'Where is your shop located?',
    answer: 'Our main store is located at 123 Tech Avenue, Silicon Valley, CA.'
  },
  {
    question: 'What are your opening hours?',
    answer: 'We are open from Monday to Saturday, 9:00 AM to 8:00 PM.'
  },
  {
    question: 'How can I contact support?',
    answer: 'You can reach us via email at support@techshop.com or call +1-800-TECH-HELP.'
  }
];

async function seedData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.DB_URL);
    console.log('Connected.');

    // 1. Clear existing data
    console.log('Clearing existing data...');
    await Category.deleteMany({});
    await Product.deleteMany({});
    await Faq.deleteMany({});

    // 2. Seed Categories
    console.log('Seeding Categories...');
    const createdCategories = await Category.insertMany(dummyCategories);
    const categoryMap = {};
    createdCategories.forEach(cat => {
      categoryMap[cat.name] = cat._id;
    });

    // 3. Seed Products with Vectors
    console.log('Seeding Products with Vectors (768 dimensions)...');
    for (const p of dummyProducts) {
      const productData = {
        ...p,
        category: categoryMap[p.categoryName]
      };
      
      // Generate vector
      const aiResult = await ai_helper.generateVectorDataForAddProduct(p);
      if (aiResult && aiResult.vector_data) {
        productData.vector_data = aiResult.vector_data;
      } else {
        console.warn(`Failed to generate vector for product: ${p.name}`);
      }

      const product = new Product(productData);
      await product.save();
      console.log(`Saved Product: ${p.name}`);
    }

    // 4. Seed FAQs with Vectors
    console.log('Seeding FAQs with Vectors (768 dimensions)...');
    for (const f of dummyFaqs) {
      const vectorData = await generateFaqVector(f);
      const faq = new Faq({
        ...f,
        vector_data: vectorData
      });
      await faq.save();
      console.log(`Saved FAQ: ${f.question}`);
    }

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding Error:', error);
    process.exit(1);
  }
}

seedData();
