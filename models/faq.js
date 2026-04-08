const mongoose = require("mongoose");

const faq = mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  category: { type: String, default: "General" },
  vector_data: { type: [Number], default: [] },
});

const Faq = mongoose.model("Faq", faq);

module.exports = Faq;
