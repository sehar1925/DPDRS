// DPDRS Backend - Profile Routes
// SRS-09 to SRS-16: Profile Management

const express = require('express');
const router = express.Router();

const { getProfile, updateProfile } = require('../controllers/profileController');
const { protect } = require('../middleware/authMiddleware');

// ─────────────────────────────────────────────
// All profile routes are PROTECTED (SRS-10)
// ─────────────────────────────────────────────

// SRS-09, SRS-10: View Profile
router.get('/me', protect, getProfile);

// SRS-11, SRS-12: Update Profile
router.put('/update', protect, updateProfile);

module.exports = router;