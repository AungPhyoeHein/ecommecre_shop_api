const { Faq, UnansweredQuestion } = require("../../models");
const ai_helper = require("../../helpers/ai_helper");

const createFaq = async (req, res, next) => {
    try {
        const { question, answer, unansweredQuestionId } = req.body;

        if (!question || !answer) {
            return res.status(400).json({ message: "Question and answer are required." });
        }

        // Generate vector data for the FAQ question
        const vectorResponse = await ai_helper.generateVectorDataForSearch({ prompt: question });
        
        if (!vectorResponse || !vectorResponse.vector_data) {
            return res.status(500).json({ message: "Failed to generate vector data for FAQ." });
        }

        const newFaq = new Faq({
            question,
            answer,
            vector_data: vectorResponse.vector_data
        });

        await newFaq.save();

        // If this FAQ was created from an unanswered question, delete it
        if (unansweredQuestionId) {
            await UnansweredQuestion.findByIdAndDelete(unansweredQuestionId);
        }

        res.status(201).json({
            message: "FAQ created successfully.",
            data: newFaq
        });
    } catch (err) {
        console.error("Create FAQ Error:", err);
        next(err);
    }
};

const getUnansweredQuestions = async (req, res, next) => {
    try {
        const questions = await UnansweredQuestion.find({}).sort({ createdAt: -1 });
        res.json({ data: questions });
    } catch (err) {
        next(err);
    }
};

const deleteUnansweredQuestion = async (req, res, next) => {
    try {
        const { id } = req.params;
        await UnansweredQuestion.findByIdAndDelete(id);
        res.json({ message: "Unanswered question deleted." });
    } catch (err) {
        next(err);
    }
};

const getAllFaqs = async (req, res, next) => {
    try {
        const faqs = await Faq.find({}).sort({ createdAt: -1 });
        res.json({ data: faqs });
    } catch (err) {
        next(err);
    }
};

const deleteFaq = async (req, res, next) => {
    try {
        const { id } = req.params;
        const deleted = await Faq.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ message: "FAQ not found." });
        }
        res.json({ message: "FAQ deleted successfully." });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    createFaq,
    getAllFaqs,
    deleteFaq,
    getUnansweredQuestions,
    deleteUnansweredQuestion
};