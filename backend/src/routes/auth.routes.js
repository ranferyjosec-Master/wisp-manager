// === auth.routes.js ===
const express = require('express');
const router = express.Router();
const { login, register, me, changePassword } = require('../controllers/auth.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.post('/login', login);
router.post('/register', authenticate, authorize('superadmin'), register);
router.get('/me', authenticate, me);
router.put('/change-password', authenticate, changePassword);

module.exports = router;
