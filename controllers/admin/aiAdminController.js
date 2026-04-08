const { GoogleGenerativeAI } = require("@google/generative-ai");
const {
  Order,
  OrderItem,
  Product,
  User,
  AdminChatHistory,
  Faq,
} = require("../../models");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * AI Admin Controller for handling natural language queries about sales and store stats.
 */
const aiAdminController = {
  /**
   * Main entry point for AI Chat
   */
  chat: async (req, res) => {
    try {
      const { prompt } = req.body;
      const adminId = req.user?.id || req.user;

      if (!prompt) {
        return res.status(400).json({ message: "Prompt is required" });
      }

      // 1. Fetch persistent chat history from DB
      let chatHistoryDoc = await AdminChatHistory.findOne({
        adminId,
        isDeleted: false,
      });
      if (!chatHistoryDoc) {
        chatHistoryDoc = new AdminChatHistory({ adminId, messages: [] });
      }

      // Format history for Gemini
      const formattedHistory = chatHistoryDoc.messages.map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.parts[0].text }],
      }));

      const model = genAI.getGenerativeModel({
        model: "gemini-3.1-flash-lite-preview",
        systemInstruction:
          "You are an expert Ecommerce Admin Assistant. Your role is to help admins with store statistics, product trends, and general store information. When asked about the store name, contact details, Myanmar text queries, or general policies, ALWAYS check the FAQ tool first. If the information is in the FAQ, use it to provide an accurate answer. You can also perform Google Searches for real-time social media trends. Be professional, concise, and helpful.",
        tools: [
          {
            googleSearch: {},
          },
          {
            functionDeclarations: [
              {
                name: "getSalesStats",
                description:
                  "Get sales statistics for a specific time period (today, yesterday, this month, last month, this year).",
                parameters: {
                  type: "object",
                  properties: {
                    period: {
                      type: "string",
                      enum: [
                        "today",
                        "yesterday",
                        "this_month",
                        "last_month",
                        "this_year",
                      ],
                      description: "The time period to get sales for.",
                    },
                  },
                  required: ["period"],
                },
              },
              {
                name: "getTopProducts",
                description: "Get the best-selling products.",
                parameters: {
                  type: "object",
                  properties: {
                    limit: {
                      type: "number",
                      description: "Number of products to return (default 5)",
                    },
                  },
                },
              },
              {
                name: "getStoreSummary",
                description:
                  "Get total users, products, and total orders count.",
                parameters: { type: "object", properties: {} },
              },
              {
                name: "getFAQ",
                description:
                  "Search for store-related information like store name, contact details, policies, and Myanmar text explanations from the FAQ database.",
                parameters: {
                  type: "object",
                  properties: {
                    query: {
                      type: "string",
                      description:
                        "The search term to find relevant FAQs (e.g., 'store name', 'delivery policy').",
                    },
                  },
                  required: ["query"],
                },
              },
            ],
          },
        ],
      });

      const chat = model.startChat({
        history: formattedHistory,
      });

      const result = await chat.sendMessage(prompt);
      const response = result.response;

      // Capture grounding metadata from Google Search
      const groundingMetadata = response.candidates?.[0]?.groundingMetadata;

      const calls = response.functionCalls();
      let finalAiResponseText = "";
      let toolResults = {};

      if (calls && calls.length > 0) {
        toolResults = {};

        for (const call of calls) {
          const { name, args } = call;
          let data;

          if (name === "getSalesStats") {
            data = await getSalesStats(args);
          } else if (name === "getTopProducts") {
            data = await getTopProducts(args);
          } else if (name === "getStoreSummary") {
            data = await getStoreSummary();
          } else if (name === "getFAQ") {
            data = await getFAQ(args);
          }

          toolResults[name] = data;
        }

        // Send tool results back to the model
        const finalResult = await chat.sendMessage(
          calls.map((call) => ({
            functionResponse: {
              name: call.name,
              response: toolResults[call.name],
            },
          })),
        );
        finalAiResponseText = finalResult.response.text();
      } else {
        finalAiResponseText = response.text();
      }

      // 2. Update and save chat history
      chatHistoryDoc.messages.push({
        role: "user",
        parts: [{ text: prompt }],
      });

      // Merge grounding metadata with tool results for history storage
      const finalData = {
        ...(Object.keys(toolResults).length > 0 ? toolResults : {}),
        ...(groundingMetadata ? { groundingMetadata } : {}),
      };

      chatHistoryDoc.messages.push({
        role: "model",
        parts: [{ text: finalAiResponseText }],
        data: Object.keys(finalData).length > 0 ? finalData : undefined,
      });
      await chatHistoryDoc.save();

      return res.status(200).json({
        response: finalAiResponseText,
        data: finalData,
      });
    } catch (error) {
      console.error("AI Admin Chat Error:", error);
      res
        .status(500)
        .json({ message: "Internal Server Error", error: error.message });
    }
  },

  /**
   * Get chat history for the logged-in admin
   */
  getHistory: async (req, res) => {
    try {
      const adminId = req.user?.id || req.user;
      const history = await AdminChatHistory.findOne({
        adminId,
        isDeleted: false,
      });

      if (!history) {
        return res.status(200).json({ messages: [] });
      }

      return res.status(200).json({ messages: history.messages });
    } catch (error) {
      console.error("Get AI History Error:", error);
      res.status(500).json({ message: "Error fetching history" });
    }
  },

  /**
   * Clear chat history for the logged-in admin
   */
  clearHistory: async (req, res) => {
    try {
      const adminId = req.user?.id || req.user;
      await AdminChatHistory.findOneAndUpdate(
        { adminId },
        { $set: { messages: [] } },
      );
      return res.status(200).json({ message: "History cleared successfully" });
    } catch (error) {
      console.error("Clear AI History Error:", error);
      res.status(500).json({ message: "Error clearing history" });
    }
  },
};

// --- Tool Implementations ---

async function getSalesStats({ period }) {
  let start = new Date();
  let end = new Date();

  if (period === "today") {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (period === "yesterday") {
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    end = new Date(start);
    end.setHours(23, 59, 59, 999);
  } else if (period === "this_month") {
    start = new Date(start.getFullYear(), start.getMonth(), 1);
  } else if (period === "last_month") {
    start = new Date(start.getFullYear(), start.getMonth() - 1, 1);
    end = new Date(start.getFullYear(), start.getMonth(), 0, 23, 59, 59, 999);
  } else if (period === "this_year") {
    start = new Date(start.getFullYear(), 0, 1);
  }

  const sales = await Order.aggregate([
    {
      $match: {
        dateOrdered: { $gte: start, $lte: end },
        status: { $ne: "cancled" },
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$totalPrice" },
        orderCount: { $sum: 1 },
      },
    },
  ]);

  return sales[0] || { totalRevenue: 0, orderCount: 0 };
}

async function getTopProducts({ limit = 5 }) {
  const topProducts = await OrderItem.aggregate([
    {
      $group: {
        _id: "$product",
        productName: { $first: "$productName" },
        totalSold: { $sum: "$quantity" },
        revenue: { $sum: { $multiply: ["$productPrice", "$quantity"] } },
      },
    },
    { $sort: { totalSold: -1 } },
    { $limit: limit },
  ]);
  return topProducts;
}

async function getStoreSummary() {
  const [userCount, productCount, orderCount] = await Promise.all([
    User.countDocuments(),
    Product.countDocuments(),
    Order.countDocuments(),
  ]);
  return { userCount, productCount, orderCount };
}

async function getFAQ({ query }) {
  if (!query) return { message: "Query is required" };

  try {
    // Perform a regex search on both question and answer fields
    const faqs = await Faq.find({
      $or: [
        { question: { $regex: query, $options: "i" } },
        { answer: { $regex: query, $options: "i" } },
        { category: { $regex: query, $options: "i" } },
      ],
    }).limit(5);

    if (faqs.length === 0) {
      return { message: "No relevant FAQs found." };
    }

    return faqs.map((f) => ({
      question: f.question,
      answer: f.answer,
      category: f.category,
    }));
  } catch (error) {
    console.error("FAQ Search Error:", error);
    return { message: "Error searching FAQ database" };
  }
}

module.exports = aiAdminController;
