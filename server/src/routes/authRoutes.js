const express    = require('express');
const router     = express.Router();
const authController = require('../controllers/authController');
const { protect }    = require('../middleware/authMiddleware');

// Public routes
router.post('/login',   authController.login);
router.post('/refresh', authController.refreshToken);

// Protected routes
router.post('/logout', protect, authController.logout);
router.get('/me',      protect, authController.getMe);

module.exports = router;