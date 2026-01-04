const jwt = require("jsonwebtoken");
const { User, Product, Order } = require("../models");
const { orderController } = require(".");
const stripe = require("stripe")(process.env.STRIPE_KEY);

const checkout = async (req, res, next) => {
  try {
    const accessToken = req
      .header("Authorization")
      .replace("Bearer", "")
      .trim();

    const tokenData = jwt.decode(accessToken);

    const user = await User.findById(tokenData._id).populate("cart");

    if (!user) {
      res.code = 404;
      throw new Error("User not found");
    }

    for (const cartItem of user.cart) {
      const product = await Product.findById(cartItem.productId);
      if (!product) {
        res.code = 404;
        throw new Error("Product not found");
      } else if (
        !cartItem.reserved &&
        product.countInStock < cartItem.quantity
      ) {
        const message = `${product.name}\n Order for ${cartItem.quantity},but only ${product.countInStock}`;
        res.code = 400;
        throw new Error(message);
      }
    }

    let customerId;
    if (user.paymentCustomerId) {
      customerId = user.paymentCustomerId;
    } else {
      const customer = await stripe.customers.create({
        metadata: { userId: tokenData._id },
      });
      customerId = customer;
      // user.paymentCustomerId = customer;
    }

    const session = await stripe.checkout.sessions.create({
      line_items: req.body.cartItems.map((items) => {
        return {
          price_data: {
            currency: "usd",
            product_data: {
              name: items.name,
              image: items.images,
              metadata: {
                productId: items.productId,
                cartProductId: items.cartProductId,
                selectedSize: items.selectedSize ?? undefined,
                selectedColor: items.selectedColor ?? undefined,
              },
            },
            unit_amount: (items.price * 100).toFixed(0),
          },
          quantity: items.quantity,
        };
      }),
      payment_method_options: {
        card: { setup_future_usage: "on_session" },
      },
      billing_address_collection: "auto",
      shipping_address_collection: {
        allowed_countries: [
          "MM",
          "US",
          "UK",
          "CN",
          "JP",
          "TH",
          "IN",
          "KR",
          "TW",
        ],
      },
      phone_number_collection: { enabled: true },
      customer: customerId,
      mode: "payment",
      success_url: "http://localhost:8080/",
      cancel_url: "http://localhost:8080",
    });
    res.status(201).json({ url: session.url });
  } catch (err) {
    next(err);
  }
};

const webhook = async (req, res, next) => {
  try {
    const signature = request.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error(`Webhook Error : ${err.message}`);
      next(err);
    }
  } catch (err) {
    next(err);
    return;
  }

  if (event.type == "checkout.session.complete") {
    const session = event.data.object;

    stripe.customers.retrieve(session.customer).then(async (customer) => {
      const line_items = await stripe.checkout.sessions.listLineItems(
        session.id,
        { expand: ["data.price.product"] }
      );

      const orderItems = line_items.data.map((item) => {
        return {
          quantity: item.quantity,
          product: item.price.product.metadata.productId,
          cartProductId: item.price.product.metadata.cartProductId,
          productPrice: item.price.unit_amount / 100,
          productName: item.price.product.name,
          productImage: item.price.product.image[0],
          selectedSize: item.price.product.metadata.selectedSize ?? undefined,
          selectedColor: item.price.product.metadata.selectedColor ?? undefined,
        };
      });

      const address =
        session.shipping_details?.address ?? session.customer_details.address;
      const order = await orderController.addOrder({
        orderItems: orderItems,
        shippingAddress:
          address.line1 === "N/A" ? address.line2 : address.line1,
        city: address.city,
        postalCode: address.postal_code,
        country: address.country,
        phone: session.customer_details.phone,
        totalPrice: session.amount_total / 100,
        user: customer.metadata.userId,
        paymentId: session.payment_intent,
      });
      let user = await user.findById(customer.metadata.userId);
      if (user && !user.paymentCustomerId) {
        user = await User.findByIdAndUpdate(
          customer.metadata.userId,
          { paymentCustomerId: session.customer },
          { new: true }
        );
      }

      const leanOrder = order.toObject();
      leanOrder["orderItems"] = orderItems;
    });
  } else {
    console.log(`Unhandled event type ${event.type}`);
  }

  res.send().end();
};

module.exports = { checkout, webhook };
