const mongoose = require("mongoose");

const WalletTransactionsSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
    },
    type: {
      type: String,
      enum: ["credit", "debit"],
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    description: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const WalletTrans = mongoose.model("WalletTrans", WalletTransactionsSchema);
module.exports = WalletTrans;
