// DPDRS Backend - Prediction Model
// MongoDB Schema v2.0: predictions collection
// Stores AI/ML disease predictions from patient-reported symptoms
// SRS-17 to SRS-41: Intelligent Disease Prediction

const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema(
  {
    // SRS-17, SRS-19: Patient who entered symptoms
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient ID is required'],
      index: true,
    },

    // SRS-17: Symptoms entered by the patient
    symptoms: {
      type: [String],
      required: [true, 'At least one symptom is required'],
      validate: {
        validator: (arr) => arr.length > 0,
        message: 'Symptoms array cannot be empty',
      },
    },

    // Optional: Free-text notes
    symptomDetails: {
      type: String,
      default: '',
      trim: true,
      maxlength: [1000, 'Symptom details cannot exceed 1000 characters'],
    },

    // SRS-20, SRS-33, SRS-39: Multiple predicted diseases with confidence
    predictedDiseases: [
      {
        diseaseId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Disease',
          default: null,
        },
        diseaseName: {
          type: String,
          required: true,
        },
        confidence: {
          type: Number,
          min: 0,
          max: 1,
          required: true,
        },
        reasoning: {
          type: String,
          default: '',
        },
        causes: { 
          type: [String], 
          default: [] },
        riskFactors: { type: [String],
           default: [] },
      },
    ],
    // SRS-36: Highest confidence prediction
    topPrediction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Disease',
      default: null,
    },

    // SRS-40, SRS-41: Precautions and self-care guidelines
    precautions: {
      type: [String],
      default: [],
    },
    selfCareGuidelines: {
      type: String,
      default: '',
    },

    // SRS-55, SRS-56, SRS-57: Urgency levels
    isEmergency: {
      type: Boolean,
      default: false,
    },
    urgencyLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
    },

    // Model versioning for auditability
    modelVersion: {
      type: String,
      default: 'gemini-3.8-flash',
    },

    // SRS-37: Status of prediction
    status: {
      type: String,
      enum: ['pending', 'completed', 'overridden', 'emergency', 'failed'],
      default: 'completed',
    },

    // Doctor override support (future)
    doctorOverride: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      default: null,
    },
    doctorOverrideNotes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Index for fast queries
predictionSchema.index({ patientId: 1, createdAt: -1 });

module.exports = mongoose.model('Prediction', predictionSchema);