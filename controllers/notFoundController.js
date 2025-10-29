const notFoundController = (req, res, next) => {
  return res.status(404).json({ code: 404, status: false, msg: "Api not found." });
};

module.exports = notFoundController;