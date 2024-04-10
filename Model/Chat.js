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
    habits: [
      {
        habit: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Habit",
        },
        verification: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Verification",
        },
        quantity: {
          type: String,
        },
        unit: {
          type: String,
        },
        of: {
          type: String,
        },
        for: {
          type: Number,
        },
      },
    ],
    // habit_verification_method: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "Verification",
    // },
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
    money_transferred: {
      type: Boolean,
      default: false,
    },
    max_points: {
      type: String,
      default: "100",
    },
    winner_user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

const Chat = mongoose.model("Chat", chatSchema);
module.exports = Chat;
