const express = require('express');
const assistantRouter = express.Router();
const { aiAssistantController, chatHistoryController } = require('../controllers');


assistantRouter.get('/', aiAssistantController.chatWithAiAssistant);
assistantRouter.delete('/history', chatHistoryController.deleteChatHistory);


module.exports = assistantRouter;
