const express = require('express');
const router = express.Router();
const {createPayment}  = require('../controllers/bankController');
const { verifyUser } = require('../middleware/authMiddleware');
router.post('/create',verifyUser, createPayment);
module.exports = router;