const express = require('express');
const router = express.Router();
const { fetchSupportedCryptoCurrency, getVPSCryptoAddress, getVPSCryptoPaymentStatus, getVPSTransaction } = require('../../app/controllers/payment/paymentController');
const { getUserDataMiddleware } = require('../../app/middlewares/user');

// Get supported cryptocurrencies
router.get('/getSupportedCurrency', fetchSupportedCryptoCurrency);

//Generate a crypto payment address
router.post('/getVPSCryptoAddress', getUserDataMiddleware,  getVPSCryptoAddress);

// // Get the status of a crypto transaction
router.get('/getVPSCryptoPaymentStatus/:address', getVPSCryptoPaymentStatus);

// Get details of a single transaction
router.get('/transaction/:id', getVPSTransaction);

module.exports = router;