// DPDRS Backend - Doctor Routes
// SRS-42 to SRS-57: Doctor Recommendation

const express = require('express');
const router = express.Router();

const { recommendDoctors, getAllDoctors } = require('../controllers/doctorController');
const { protect } = require('../middleware/authMiddleware');

// SRS-42 to 48: Recommend doctors by disease (Protected)
router.post('/recommend', protect, recommendDoctors);

// Get all doctors (with optional filters) (Protected)
router.get('/', protect, getAllDoctors);

module.exports = router;