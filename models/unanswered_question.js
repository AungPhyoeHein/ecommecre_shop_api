const mongoose = require('mongoose');

const unansweredQuestionSchema = mongoose.Schema({
    question: {
        type: String,
        required: true
    },
    intent: {
        type: String,
        enum: ['faq', 'products'],
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const UnansweredQuestion = mongoose.model('UnansweredQuestion', unansweredQuestionSchema);

module.exports = UnansweredQuestion;