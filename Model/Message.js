const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema({
  public_id: {
    type: String,
  },
  url: {
    type: String,
  },
});

const messageSchema = new mongoose.Schema(
  {
    content: String,
    type:String,
    activity_verification:String,
    date:String,
    // date:
    attachments: [attachmentSchema],
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    meta_data: {
      type: mongoose.Schema.Types.Mixed  // Change the type to accept any data type
    },
  },
  {
    timestamps: true,
  }
);

const Message = mongoose.model("Message", messageSchema);
module.exports = Message;
