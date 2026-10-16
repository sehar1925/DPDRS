// DPDRS Backend - Disease Model
// MongoDB Schema v2.0: diseases collection
// Stores disease reference data used by the prediction engine

const mongoose = require('mongoose');

const diseaseSchema = new mongoose.Schema(
  {
    diseaseName: {
      type: String,
      required: [true, 'Disease name is required'],
      unique: true,
      trim: true,
    },
    symptoms: {
      type: [String],
      default: [],
    },
    precautions: {
      type: [String],
      default: [],
    },
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe', 'critical'],
      default: 'moderate',
    },
    treatmentGuidelines: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Disease', diseaseSchema);