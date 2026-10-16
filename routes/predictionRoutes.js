// DPDRS Backend - Prediction Routes
// SRS-17 to SRS-41: Intelligent Disease Prediction

const express = require('express');
const router = express.Router();

const {
  predictFromSymptoms,
  getPredictionHistory,
  getPredictionById,
} = require('../controllers/predictionController');
const { protect } = require('../middleware/authMiddleware');

// SRS-17 to SRS-41: Predict disease from symptoms
router.post('/predict', protect, predictFromSymptoms);

// SRS-61: Get user's prediction history
router.get('/history', protect, getPredictionHistory);

// Get specific prediction details
router.get('/:id', protect, getPredictionById);

module.exports = router;