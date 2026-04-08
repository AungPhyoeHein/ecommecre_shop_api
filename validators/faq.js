const { body } = require('express-validator');

const createFaqValidator = [
  body('question')
    .notEmpty()
    .withMessage('Question is required.')
    .isString()
    .withMessage('Question must be a string.'),
  body('answer')
    .notEmpty()
    .withMessage('Answer is required.')
    .isString()
    .withMessage('Answer must be a string.'),
  body('unansweredQuestionId')
    .optional()
    .isMongoId()
    .withMessage('Invalid unanswered question ID.'),
];

const updateFaqValidator = [
  body().custom((value, { req }) => {
    const { question, answer } = req.body || {};
    if (!question && !answer) {
      throw new Error('Provide question or answer to update.');
    }
    return true;
  }),
  body('question')
    .optional()
    .isString()
    .withMessage('Question must be a string.'),
  body('answer')
    .optional()
    .isString()
    .withMessage('Answer must be a string.'),
];

module.exports = {
  createFaqValidator,
  updateFaqValidator,
};
