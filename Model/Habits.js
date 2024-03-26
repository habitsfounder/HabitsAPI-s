const mongoose = require("mongoose");

const habitSchema = new mongoose.Schema(
  {
    habit: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Habit = mongoose.model("Habit", habitSchema);
module.exports = Habit;
