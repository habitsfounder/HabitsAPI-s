const mongoose = require("mongoose");

const verificationSchema = new mongoose.Schema(
  {
    method: {
      type: String,
    },
    // sender: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "User",
    //   required: true,
    // },
    // receiver: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "User",
    //   required: true,
    // },
  },
  {
    timestamps: true,
  }
);

const Verification = mongoose.model("Verification", verificationSchema);
module.exports = Verification;
