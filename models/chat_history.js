const mongoose = require('mongoose');

const chatHistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    messages: [
        {
            role: {
                type: String,
                enum: ['user', 'model'],
                required: true
            },
            parts: [{
                text: {
                    type: String,
                    required: true
                }
            }],
            responseType: {
                type: String,
                default: 'text'
            },
            data: {
                type: mongoose.Schema.Types.Mixed
            },
            timestamp: {
                type: Date,
                default: Date.now
            }
        }
    ],
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date
    }
}, { timestamps: true });

// Limit the history to keep only the last N messages to save space
chatHistorySchema.pre('save', function (next) {
    const maxMessages = 50; // Increased limit to 50 for better history
    if (this.messages.length > maxMessages) {
        this.messages = this.messages.slice(-maxMessages);
    }
    next();
});

const ChatHistory = mongoose.model('ChatHistory', chatHistorySchema);

module.exports = ChatHistory;
