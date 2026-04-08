const express = require('express');
const assistantRouter = express.Router();
const { aiAssistantController, chatHistoryController } = require('../controllers');
const Token = require('../models/token');

const requireLoggedIn = async (req, res, next) => {
  try {
    if (req.user) {
      return next();
    }
    const header = req.header('Authorization') || '';
    if (!header.toLowerCase().startsWith('bearer ')) {
      return res.status(401).json({ message: "Please login to use the assistant." });
    }
    const accessToken = header.slice(7).trim();
    if (!accessToken) {
      return res.status(401).json({ message: "Please login to use the assistant." });
    }

    const token = await Token.findOne({ accessToken });
    if (!token) {
      return res.status(401).json({ message: "Please login to use the assistant." });
    }

    req.user = token.userId;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Please login to use the assistant." });
  }
};

assistantRouter.get('/', requireLoggedIn, aiAssistantController.chatWithAiAssistant);
assistantRouter.get('/history', requireLoggedIn, chatHistoryController.getChatHistory);
assistantRouter.delete('/history', requireLoggedIn, chatHistoryController.deleteChatHistory);


module.exports = assistantRouter;
