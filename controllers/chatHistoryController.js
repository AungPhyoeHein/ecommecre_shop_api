const { ChatHistory, AuditLog } = require("../models");
const mongoose = require("mongoose");

/**
 * Retrieve the authenticated user's chat history.
 */
const getChatHistory = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized access." });
    }

    const chatHistory = await ChatHistory.findOne({ userId, isDeleted: false });

    if (!chatHistory || !chatHistory.messages) {
      return res.status(200).json({ messages: [] });
    }

    // Format messages for the frontend
    const formattedMessages = chatHistory.messages.map(msg => {
      const type = msg.responseType || 'text';
      const text = msg.parts?.[0]?.text || '';
      
      const formattedMsg = {
        _id: msg._id,
        role: msg.role === 'model' ? 'ai' : 'user',
        type: type,
        message: text,
        timestamp: msg.timestamp
      };

      if (msg.data) {
        formattedMsg.data = msg.data;
      }

      return formattedMsg;
    });

    res.status(200).json({ messages: formattedMessages });
  } catch (error) {
    console.error("Get Chat History Error:", error);
    res.status(500).json({ 
      message: "An error occurred while retrieving chat history.",
      success: false 
    });
  }
};

/**
 * Permanently delete (soft delete) the authenticated user's chat history.
 */
const deleteChatHistory = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user?.id || req.user;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized access." });
    }

    // Find the chat history for the user that isn't already soft-deleted
    const chatHistory = await ChatHistory.findOne({ userId, isDeleted: false }).session(session);

    if (!chatHistory) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Chat history not found." });
    }

    // Perform soft delete
    chatHistory.isDeleted = true;
    chatHistory.deletedAt = new Date();
    await chatHistory.save({ session });

    // Audit log
    await AuditLog.create([{
      userId,
      action: 'CHAT_HISTORY_DELETE',
      details: { chatHistoryId: chatHistory._id, deletedAt: chatHistory.deletedAt },
      ipAddress: req.ip || req.connection.remoteAddress
    }], { session });

    console.log(`[AUDIT] Chat history deleted for user: ${userId} at ${chatHistory.deletedAt}`);

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: "Chat history permanently deleted successfully.",
      success: true
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Delete Chat History Error:", error);
    res.status(500).json({ 
      message: "An error occurred while deleting chat history. Please try again later.",
      success: false 
    });
  }
};

module.exports = {
  getChatHistory,
  deleteChatHistory
};
