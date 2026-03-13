const { Faq, UnansweredQuestion } = require("../../models");
const ai_helper = require("../../helpers/ai_helper");
const { validationResult } = require('express-validator');

const buildFaqEmbeddingText = ({ question, answer }) => {
    return [question, answer].filter((v) => typeof v === "string" && v.trim()).join("\n");
};

const createFaq = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessage = errors.array().map((error) => ({
            field: error.path,
            message: error.msg,
        }));
        return res.status(400).json({ errors: errorMessage });
    }
    try {
        const { question, answer, unansweredQuestionId } = req.body || {};

        if (!question || !answer) {
            return res.status(400).json({ message: "Question and answer are required." });
        }

        // Generate vector data for the FAQ question
        const textToEmbed = buildFaqEmbeddingText({ question, answer });
        const vectorResponse = await ai_helper.generateVectorDataForSearch({ prompt: textToEmbed });
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

const updateFaq = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { question, answer } = req.body || {};

        if (!question && !answer) {
            return res.status(400).json({ message: "Provide question or answer to update." });
        }

        const existing = await Faq.findById(id);
        if (!existing) {
            return res.status(404).json({ message: "FAQ not found." });
        }

        const nextQuestion = typeof question === "string" ? question : existing.question;
        const nextAnswer = typeof answer === "string" ? answer : existing.answer;

        const textToEmbed = buildFaqEmbeddingText({ question: nextQuestion, answer: nextAnswer });
        const vectorResponse = await ai_helper.generateVectorDataForSearch({ prompt: textToEmbed });

        if (!vectorResponse || !vectorResponse.vector_data) {
            return res.status(500).json({ message: "Failed to generate vector data for FAQ." });
        }

        existing.question = nextQuestion;
        existing.answer = nextAnswer;
        existing.vector_data = vectorResponse.vector_data;

        await existing.save();

        return res.json({ message: "FAQ updated successfully.", data: existing });
    } catch (err) {
        console.error("Update FAQ Error:", err);
        next(err);
    }
};

const reindexFaqVectors = async (req, res, next) => {
    try {
        const faqs = await Faq.find({});
        let updated = 0;
        let failed = 0;

        for (const f of faqs) {
            const textToEmbed = buildFaqEmbeddingText({ question: f.question, answer: f.answer });
            if (!textToEmbed) continue;

            const vectorResponse = await ai_helper.generateVectorDataForSearch({ prompt: textToEmbed });
            if (!vectorResponse || !vectorResponse.vector_data) {
                failed += 1;
                continue;
            }

            f.vector_data = vectorResponse.vector_data;
            await f.save();
            updated += 1;
        }

        return res.json({
            message: "FAQ reindex completed.",
            data: { total: faqs.length, updated, failed }
        });
    } catch (err) {
        console.error("Reindex FAQ Error:", err);
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
    updateFaq,
    reindexFaqVectors,
    getAllFaqs,
    deleteFaq,
    getUnansweredQuestions,
    deleteUnansweredQuestion
};
