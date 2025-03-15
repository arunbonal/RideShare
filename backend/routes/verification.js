const express = require('express');
const { sendVerificationCode, verifyCode } = require('../controller/verification');

const router = express.Router();

router.post('/send', sendVerificationCode);
router.post('/verify', verifyCode);

module.exports = router;