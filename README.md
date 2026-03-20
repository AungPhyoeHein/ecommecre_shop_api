# E-Commerce Shop API

A robust and feature-rich RESTful API for a modern e-commerce platform, built with Node.js, Express, and MongoDB. This API supports advanced features like vector-based product search, AI-powered customer assistance, and Stripe payment integration.

## 🚀 Features

- **User Authentication**: Secure signup, login, password reset (OTP), and JWT-based authorization.
- **Product Management**: Complete CRUD for products, including image uploads and review systems.
- **Category Management**: Organize products into hierarchical categories.
- **Cart & Wishlist**: Persistent user carts and wishlists for a personalized shopping experience.
- **Order Processing**: Seamless order creation, status tracking, and history.
- **Checkout & Payments**: Integrated with Stripe for secure payment processing and webhook handling.
- **AI Assistant**: 
  - **Vector Search**: Semantic product search using Gemini embeddings.
  - **FAQ Support**: AI-powered answers to common customer questions.
  - **General Chat**: Conversational AI assistant for enhanced user engagement.
- **Admin Dashboard**: Comprehensive admin tools for managing users, products, categories, and orders.
- **Scheduled Tasks**: Automated cleanup and background tasks using `node-cron`.

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Mongoose)
- **AI/ML**: Google Gemini (Gemini-1.5-Flash, Gemini-Embedding-001)
- **Payments**: Stripe
- **Email**: Nodemailer
- **Testing**: Jest, Supertest
- **Utilities**: Multer (Image uploads), Bcryptjs (Hashing), JSON Web Tokens (JWT)

## 📦 Installation

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd ecommecre_shop_api
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Setup**:
    Create a `.env` file in the root directory and add the following variables (refer to `.env.example`):
    ```env
    PORT=3000
    HOST=localhost
    API_URL=/api/v1
    DB_URL=mongodb://localhost:27017/ecommerce
    SECRET=your_jwt_secret
    GEMINI_API_KEY=your_gemini_api_key
    STRIPE_SECRET_KEY=your_stripe_secret_key
    EMAIL_USER=your_email@gmail.com
    EMAIL_PASS=your_email_password
    ```

4.  **Seed Database (Optional)**:
    ```bash
    node seed.js
    ```

## 🚀 Running the App

- **Development Mode**:
  ```bash
  npm run dev
  ```

- **Production Mode**:
  ```bash
  npm start
  ```

## 🧪 Testing

The project includes a comprehensive test suite with 90%+ code coverage for critical helpers.

- **Run all tests**:
  ```bash
  npm test
  ```

- **Run tests with coverage**:
  ```bash
  npm run test:coverage
  ```

- **Watch mode**:
  ```bash
  npm run test:watch
  ```

## 📖 API Documentation

Detailed documentation of all available endpoints can be found in [API.md](API.md).

## 📄 License

This project is licensed under the ISC License.
