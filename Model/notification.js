
const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      default: null,
    },
    is_read :{
        type : Number,
        defaultValue:0
      },
      status :{
        type : Number,
        defaultValue:0
      },
      sender_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      chat_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chat",
        required: true,
      },
     receiver_id: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
 
  },
  {
    timestamps: true,
  }
);

const Notification = mongoose.model("Notification", NotificationSchema);
module.exports = Notification;
