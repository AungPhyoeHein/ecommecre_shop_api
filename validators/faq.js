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

module.exports = {
  createFaqValidator,
};
