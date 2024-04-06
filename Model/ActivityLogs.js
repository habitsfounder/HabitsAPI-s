const mongoose = require("mongoose");

const ActivityLogsSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    chat_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
    },
    habit_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Habit",
    },
    points_earned: {
      type: String,
    },
    activity_done: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const ActivityLog = mongoose.model("ActivityLog", ActivityLogsSchema);
module.exports = ActivityLog;
