const express = require('express');
const assistantRouter = express.Router();
const { aiAssistantController } = require('../controllers');


assistantRouter.get('/',aiAssistantController.chatWithAiAssistant);


module.exports = assistantRouter;
