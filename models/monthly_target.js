const mongoose = require("mongoose");

const monthlyTargetSchema = mongoose.Schema(
  {
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
    },
    targetAmount: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Unique constraint to ensure only one target per month/year
monthlyTargetSchema.index({ month: 1, year: 1 }, { unique: true });

const MonthlyTarget = mongoose.model("MonthlyTarget", monthlyTargetSchema);
module.exports = MonthlyTarget;
