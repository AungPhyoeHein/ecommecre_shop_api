const express = require('express');
const assistantRouter = express.Router();
const { aiAssistantController, chatHistoryController } = require('../controllers');
const Token = require('../models/token');

const attachUserIfTokenPresent = async (req, _res, next) => {
  try {
    const header = req.header('Authorization') || '';
    if (!header.toLowerCase().startsWith('bearer ')) return next();
    const accessToken = header.slice(7).trim();
    if (!accessToken) return next();

    const token = await Token.findOne({ accessToken });
    if (token) {
      req.user = token.userId;
    }
    return next();
  } catch (err) {
    return next();
  }
};

assistantRouter.get('/', attachUserIfTokenPresent, aiAssistantController.chatWithAiAssistant);
assistantRouter.delete('/history', attachUserIfTokenPresent, chatHistoryController.deleteChatHistory);


module.exports = assistantRouter;
