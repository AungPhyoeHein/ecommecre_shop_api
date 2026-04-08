# E-Commerce Shop API Documentation

Base URL: `http://localhost:3000/api/v1`

## 🔐 Authentication

### Register
- **URL**: `/auth/register`
- **Method**: `POST`
- **Auth Required**: No
- **Body**:
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "09123456789",
    "password": "StrongPassword123!"
  }
  ```
- **Success Response**: `201 Created`

### Login
- **URL**: `/auth/login`
- **Method**: `POST`
- **Auth Required**: No
- **Body**:
  ```json
  {
    "email": "john@example.com",
    "password": "StrongPassword123!"
  }
  ```
- **Success Response**: `200 OK` (Returns user object with `accessToken`)

### Forgot Password
- **URL**: `/auth/forgot-password`
- **Method**: `POST`
- **Body**: `{"email": "john@example.com"}`
- **Description**: Sends a 4-digit OTP to the user's email.

### Verify OTP
- **URL**: `/auth/verify-otp`
- **Method**: `POST`
- **Body**: `{"email": "john@example.com", "otp": "1234"}`

### Reset Password
- **URL**: `/auth/reset-password`
- **Method**: `POST`
- **Body**: `{"email": "john@example.com", "newPassword": "NewStrongPassword123!"}`

---

## 🛒 Products

### Get All Products
- **URL**: `/products`
- **Method**: `GET`
- **Query Params**: `page`, `limit`, `category`

### Search Products
- **URL**: `/products/search`
- **Method**: `GET`
- **Query Params**: `q` (search query)

### Get Product Detail
- **URL**: `/products/:id`
- **Method**: `GET`

### Product Reviews
- **Leave Review**: `POST /products/:id/reviews` (Auth Required)
- **Get Reviews**: `GET /products/:id/reviews`
- **Edit Review**: `PATCH /products/:productId/reviews/:reviewId` (Auth Required)
- **Delete Review**: `DELETE /products/:productId/reviews/:reviewId` (Auth Required)

---

## 📂 Categories

### Get All Categories
- **URL**: `/categories`
- **Method**: `GET`

### Get Category Detail
- **URL**: `/categories/:id`
- **Method**: `GET`

---

## 👤 Users

### Get User Profile
- **URL**: `/users/:id`
- **Method**: `GET` (Auth Required)

### Update Profile
- **URL**: `/users/:id`
- **Method**: `PATCH` (Auth Required)

### Wishlist
- **Get Wishlist**: `GET /users/:id/wishlist` (Auth Required)
- **Add to Wishlist**: `POST /users/:id/wishlist` (Auth Required, Body: `{"productId": "..."}`)
- **Remove**: `DELETE /users/:id/wishlist` (Auth Required, Body: `{"productId": "..."}`)

### Cart
- **Get Cart**: `GET /users/:id/cart` (Auth Required)
- **Add to Cart**: `POST /users/:id/cart` (Auth Required, Body: `{"productId": "...", "quantity": 1, "selectedSize": "M", "selectedColor": "Red"}`)
- **Update Quantity**: `PUT /users/:id/cart/:cartProductId` (Auth Required, Body: `{"quantity": 2}`)
- **Remove from Cart**: `DELETE /users/:id/cart/:cartProductId` (Auth Required)

---

## 💳 Checkout & Orders

### Checkout (Stripe)
- **URL**: `/checkout`
- **Method**: `POST` (Auth Required)
- **Body**:
  ```json
  {
    "cartItems": [
      {
        "productId": "...",
        "name": "...",
        "images": ["..."],
        "price": 100,
        "quantity": 1
      }
    ]
  }
  ```
- **Success Response**: `201 Created` (Returns Stripe Checkout URL)

### Get User Orders
- **URL**: `/orders/users/:userId`
- **Method**: `GET` (Auth Required)

### Get Order Detail
- **URL**: `/orders/:id`
- **Method**: `GET` (Auth Required)

---

## 🤖 AI Assistant

### Chat with Assistant
- **URL**: `/assistant`
- **Method**: `GET`
- **Query Params**: `message` (user prompt)
- **Description**: 
  - If no message: Returns top 5 rated products.
  - Product query: Returns top 5 products matching semantic search (Gemini embeddings).
  - FAQ query: Returns AI-generated answer based on shop knowledge base.
  - General query: Conversational AI response.

---

## 🛠️ Admin

All admin routes require an Admin JWT token and are prefixed with `/admin`.

### Dashboard Stats
- **User Count**: `GET /admin/users/count`
- **Product Count**: `GET /admin/products/count`
- **Order Count**: `GET /admin/orders/count`

### Manage Categories
- **Add**: `POST /admin/categories`
- **Edit**: `PATCH /admin/categories/:id`
- **Delete**: `DELETE /admin/categories/:id`

### Manage Products
- **Add**: `POST /admin/products` (Includes vector generation)
- **Edit**: `PATCH /admin/products/:id` (Includes vector update)
- **Delete**: `DELETE /admin/products/:id`

### Manage Orders
- **List All**: `GET /admin/orders`
- **Change Status**: `PATCH /admin/orders/:id` (Body: `{"status": "Shipped"}`)
- **Delete**: `DELETE /admin/orders/:id`
