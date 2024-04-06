const express = require('express');
const router = express.Router();
const walletTransController = require('../Controller/WalletTransactions');
const { isAuthJWT, authorizeRoles } = require("../Utils/jwt")

// Create a new wallet transaction
router.post('/createWalletTransaction', isAuthJWT, walletTransController.createWalletTransaction);

// Get all wallet transactions
router.get('/getAllWalletTransactions', isAuthJWT, walletTransController.getAllWalletTransactions);

// Get wallet transaction by ID
router.get('/getWalletTransactionById/:id', isAuthJWT, walletTransController.getWalletTransactionById);

// Update wallet transaction by ID
router.put('/updateWalletTransaction/:id', isAuthJWT, walletTransController.updateWalletTransaction);

// Delete wallet transaction by ID
router.delete('/deleteWalletTransaction/:id', isAuthJWT, walletTransController.deleteWalletTransaction);

module.exports = router;
