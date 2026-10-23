// DPDRS Backend - Prediction Routes
// SRS-17 to SRS-41: Intelligent Disease Prediction

const express = require('express');
const router = express.Router();

// ✅ Controllers import karein
const {
  predictFromSymptoms,
  getPredictionHistory,
  getPredictionById,
} = require('../controllers/predictionController');

// ✅ Auth Middleware import karein
const { protect } = require('../middleware/authMiddleware');

// ─────────────────────────────────────────────
// All prediction routes are PROTECTED (SRS-10)
// ─────────────────────────────────────────────

// SRS-17 to SRS-41: Predict disease from symptoms
router.post('/predict', protect, predictFromSymptoms);

// SRS-61: Get user's prediction history
router.get('/history', protect, getPredictionHistory);

// Get specific prediction details (own only)
router.get('/:id', protect, getPredictionById);

module.exports = router;