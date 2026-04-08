const { MonthlyTarget } = require("../../models");

const getMonthlyTarget = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({ message: "Month and Year are required." });
    }

    const target = await MonthlyTarget.findOne({ month, year });
    if (!target) {
      return res.json({ targetAmount: 0 });
    }
    return res.json(target);
  } catch (err) {
    next(err);
  }
};

const setMonthlyTarget = async (req, res, next) => {
  try {
    const { month, year, targetAmount } = req.body;
    if (!month || !year || targetAmount === undefined) {
      return res.status(400).json({ message: "Month, Year and Target Amount are required." });
    }

    const target = await MonthlyTarget.findOneAndUpdate(
      { month, year },
      { targetAmount },
      { upsert: true, new: true },
    );

    return res.json(target);
  } catch (err) {
    next(err);
  }
};

module.exports = { getMonthlyTarget, setMonthlyTarget };
