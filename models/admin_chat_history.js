const mongoose = require('mongoose');

const adminChatHistorySchema = new mongoose.Schema({
    adminId: {
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
    }
}, { timestamps: true });

// Limit the history to keep only the last 50 messages
adminChatHistorySchema.pre('save', function (next) {
    const maxMessages = 50;
    if (this.messages.length > maxMessages) {
        this.messages = this.messages.slice(-maxMessages);
    }
    next();
});

const AdminChatHistory = mongoose.model('AdminChatHistory', adminChatHistorySchema);

module.exports = AdminChatHistory;
