const WalletTrans = require("../Model/WalletTransactions");

// Create a new wallet transaction
exports.createWalletTransaction = async (req, res, next) => {
  try {
    const { amount, type, description } = req.body;

    const userId = req.user;

    if (!["credit", "debit"].includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid transaction type" });
    }

    const newTransaction = await WalletTrans.create({ amount, type, user_id: userId, description });

    res.status(201).json({ success: true, data: newTransaction });
  } catch (error) {
    next(error);
  }
};

// Get all wallet transactions for the authenticated user
exports.getAllWalletTransactions = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const transactions = await WalletTrans.find({ user_id: userId }).populate('user_id').sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: transactions });
  } catch (error) {
    next(error);
  }
};

// Get wallet transaction by ID for the authenticated user
exports.getWalletTransactionById = async (req, res, next) => {
  const { id } = req.params;
  
  try {
    const userId = req.user.id;

    const transaction = await WalletTrans.findOne({ _id: id, user_id: userId }).populate('user_id');

    if (!transaction) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    res.status(200).json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
};

// Update wallet transaction by ID for the authenticated user
exports.updateWalletTransaction = async (req, res, next) => {
  const { id } = req.params;
  const { amount, type, description } = req.body;
  
  try {
    const userId = req.user.id;

    const updatedTransaction = await WalletTrans.findOneAndUpdate(
      { _id: id, user_id: userId },
      { amount, type, description },
      { new: true }
    );

    if (!updatedTransaction) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    res.status(200).json({ success: true, data: updatedTransaction });
  } catch (error) {
    next(error);
  }
};

// Delete wallet transaction by ID for the authenticated user
exports.deleteWalletTransaction = async (req, res, next) => {
  const { id } = req.params;
  
  try {
    const userId = req.user.id;

    const deletedTransaction = await WalletTrans.findOneAndDelete({ _id: id, user_id: userId });

    if (!deletedTransaction) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    res.status(200).json({ success: true, message: "Transaction deleted successfully" });
  } catch (error) {
    next(error);
  }
};
