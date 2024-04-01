const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    groupChat: {
      type: Boolean,
      default: false,
    },
    groupImage: {
      type: String,
    },
    groupDescription: {
      type: String,
      default: null,
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    habit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Habit",
    },
    habit_verification_method: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Verification",
    },
    activityStartDate: {
      type: Date,
    },
    activityEndDate: {
      type: Date,
    },
    monetaryPotAmount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Chat = mongoose.model("Chat", chatSchema);
module.exports = Chat;
