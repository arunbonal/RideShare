const express = require('express');
const { sendVerificationCode, verifyCode } = require('../controller/verification');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.post('/send', authMiddleware.isAuthenticated, sendVerificationCode);
router.post('/verify', authMiddleware.isAuthenticated, verifyCode);

module.exports = router;