const mongoose = require("mongoose");

const verificationSchema = new mongoose.Schema(
  {
    method: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Verification = mongoose.model("Verification", verificationSchema);
module.exports = Verification;
