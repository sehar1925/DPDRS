// DPDRS Backend - Auth Routes

const express = require('express');
const router = express.Router();

const { registerUser } = require('../controllers/registerController');
const { loginUser } = require('../controllers/loginController');
const { changePassword } = require('../controllers/changePasswordController');
const { logoutUser } = require('../controllers/logoutController');
const { protect } = require('../middleware/authMiddleware');

// SRS-01 to SRS-04: Register
router.post('/register', registerUser);

// SRS-05, SRS-06: Login
router.post('/login', loginUser);

// SRS-07: Change Password (Protected)
router.put('/change-password', protect, changePassword);

// SRS-08: Logout (Protected)
router.post('/logout', protect, logoutUser);

module.exports = router;