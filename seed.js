
const mongoose = require('mongoose');
const { Product, Category, Faq } = require('./models');
const ai_helper = require('./helpers/ai_helper');
require('dotenv').config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log('Connected to MongoDB');

    // 1. Create a Category
    let category = await Category.findOne({ name: 'Electronics' });
    if (!category) {
      category = await new Category({
        name: 'Electronics',
        image: 'http://localhost:8080/uploads/electronics.png',
        color: '#ff0000'
      }).save();
      console.log('Created Category: Electronics');
    }

    // 2. Create a Car Category
    let carCategory = await Category.findOne({ name: 'Automobiles' });
    if (!carCategory) {
      carCategory = await new Category({
        name: 'Automobiles',
        image: 'http://localhost:8080/uploads/cars.png',
        color: '#0000ff'
      }).save();
      console.log('Created Category: Automobiles');
    }

    // 3. Add Products
    const productsToSeed = [
      {
        name: 'MacBook Pro 16',
        description: 'Powerful laptop for professionals with M3 Max chip.',
        price: 2499,
        category: category._id,
        image: 'http://localhost:8080/uploads/macbook.png',
        countInStock: 10,
        sizes: ['16-inch']
      },
      {
        name: 'iPhone 15 Pro',
        description: 'Latest Apple smartphone with titanium design.',
        price: 999,
        category: category._id,
        image: 'http://localhost:8080/uploads/iphone.png',
        countInStock: 20,
        sizes: ['128GB', '256GB']
      },
      {
        name: 'Red Lamborghini Huracan',
        description: 'Luxury sports car with V10 engine, red color, high performance.',
        price: 250000,
        category: carCategory._id,
        image: 'http://localhost:8080/uploads/lamborghini.png',
        countInStock: 1,
        sizes: ['Standard']
      }
    ];

    for (const p of productsToSeed) {
      let product = await Product.findOne({ name: p.name });
      if (!product) {
        // Generate vector data
        const aiResult = await ai_helper.generateVectorDataForAddProduct(p);
        if (aiResult) {
          p.vector_data = aiResult.vector_data;
          p.aiStatus = 'completed';
        }
        product = await new Product(p).save();
        console.log(`Created Product: ${p.name}`);
      } else if (product.vector_data.length === 0) {
        // Update vector data if missing
        const aiResult = await ai_helper.generateVectorDataForAddProduct(product);
        if (aiResult) {
          product.vector_data = aiResult.vector_data;
          product.aiStatus = 'completed';
          await product.save();
          console.log(`Updated Vector for Product: ${p.name}`);
        }
      }
    }

    // 4. Add FAQs
    const faqsToSeed = [
      {
        question: 'Where is your shop located?',
        answer: 'Our main shop is located at 123 Main Street, Yangon, Myanmar.'
      },
      {
        question: 'What are your opening hours?',
        answer: 'We are open daily from 9:00 AM to 8:00 PM.'
      },
      {
        question: 'How can I contact support?',
        answer: 'You can contact us via phone at +95 912345678 or email at support@ecommerceshop.com.'
      }
    ];

    for (const f of faqsToSeed) {
      let faq = await Faq.findOne({ question: f.question });
      if (!faq) {
        // Vectorize FAQ
        const aiResponse = await ai_helper.generateVectorDataForSearch({ prompt: f.question });
        if (aiResponse && aiResponse.vector_data) {
          f.vector_data = aiResponse.vector_data;
        }
        faq = await new Faq(f).save();
        console.log(`Created FAQ: ${f.question}`);
      } else if (faq.vector_data.length === 0) {
        // Update vector data if missing
        const aiResponse = await ai_helper.generateVectorDataForSearch({ prompt: faq.question });
        if (aiResponse && aiResponse.vector_data) {
          faq.vector_data = aiResponse.vector_data;
          await faq.save();
          console.log(`Updated Vector for FAQ: ${f.question}`);
        }
      }
    }

    console.log('Seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seed();
