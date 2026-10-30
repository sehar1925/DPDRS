// DPDRS Backend - Prediction Controller
// SRS-17 to SRS-41: Intelligent Disease Prediction

const Disease = require('../models/Disease');
const Prediction = require('../models/Prediction');
const { predictDisease, SymptomValidationError, PredictionNoMatchError, GeminiQuotaError } = require('../utils/geminiClient');

// ═══════════════════════════════════════════════
// SRS-17 to SRS-41: Predict Disease from Symptoms
// POST /api/prediction/predict
// ═══════════════════════════════════════════════
const predictFromSymptoms = async (req, res) => {
  try {
    const { symptoms, symptomDetails } = req.body;

    // SRS-18: Validate symptoms
    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one symptom is required',
      });
    }

    const cleanSymptoms = symptoms
      .filter((s) => typeof s === 'string' && s.trim().length > 0)
      .map((s) => s.trim().toLowerCase());

    if (cleanSymptoms.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Symptoms must be non-empty strings',
      });
    }

    if (cleanSymptoms.length > 20) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 20 symptoms allowed per prediction',
      });
    }

    // SRS-19: Get disease reference database
    const diseasesReference = await Disease.find({}).lean();

    if (!diseasesReference || diseasesReference.length === 0) {
      return res.status(503).json({
        success: false,
        message: 'Disease database not available. Please try again later.',
      });
    }

    console.log(`🔍 Predicting for ${cleanSymptoms.length} symptoms...`);

    // SRS-31 to SRS-41: Call Gemini AI
    let aiResult;
    try {
      console.log(`🔍 Predicting for: [${cleanSymptoms.join(', ')}]...`);
      aiResult = await predictDisease(cleanSymptoms, diseasesReference);
    } catch (aiError) {
      // ✅ Agar symptoms ghalat hain, toh direct 400 (Bad Request) bhejo
      if (aiError instanceof GeminiQuotaError || aiError.name === 'GeminiQuotaError') {
        return res.status(429).json({ success: false, message: aiError.message });
      }
      if (aiError instanceof PredictionNoMatchError || aiError.name === 'PredictionNoMatchError') {
        return res.status(422).json({ success: false, message: aiError.message });
      }
      if (aiError instanceof SymptomValidationError || aiError.name === 'SymptomValidationError') {
        return res.status(400).json({
          success: false,
          message: aiError.message,
        });
      }

      // Agar API fail ho jaye
      console.error('❌ API failed:', aiError.message);
      return res.status(503).json({
        success: false,
        message: 'AI prediction service is currently unavailable. Please try again later.',
      });
    }

    // SRS-20, SRS-33, SRS-39: Map predicted diseases with DB IDs
    const predictedDiseasesWithIds = [];

    for (const predicted of aiResult.predictedDiseases) {
      const diseaseDoc = diseasesReference.find(
        (d) => d.diseaseName.toLowerCase() === predicted.diseaseName.toLowerCase()
      );

      predictedDiseasesWithIds.push({
        diseaseId: diseaseDoc ? diseaseDoc._id : null,
        diseaseName: predicted.diseaseName,
        confidence: predicted.confidence,
        reasoning: predicted.reasoning || '',
        causes: Array.isArray(predicted.causes) ? predicted.causes : [],
        riskFactors: Array.isArray(predicted.riskFactors) ? predicted.riskFactors : [],
      });
    }

    // SRS-36: Top prediction
    const topPredictionDoc = diseasesReference.find(
      (d) =>
        d.diseaseName.toLowerCase() ===
        aiResult.predictedDiseases[0].diseaseName.toLowerCase()
    );

    // SRS-40, SRS-41: Precautions & self-care
    const precautionsFromDB = topPredictionDoc ? topPredictionDoc.precautions : [];
    const finalPrecautions =
      precautionsFromDB && precautionsFromDB.length > 0
        ? precautionsFromDB
        : aiResult.precautions || [];

    // ✅ FIX: Urgency Level ko sanitize karein (YAHAN ADD KIYA HAI)
    let safeUrgency = (aiResult.urgencyLevel || 'low').toLowerCase().trim();
    if (safeUrgency === 'moderate') safeUrgency = 'medium';
    if (!['low', 'medium', 'high', 'critical'].includes(safeUrgency)) {
      safeUrgency = 'low'; // Fallback
    }

    // Create Prediction document
    const prediction = await Prediction.create({
      patientId: req.user._id,
      symptoms: cleanSymptoms,
      symptomDetails: symptomDetails || '',
      predictedDiseases: predictedDiseasesWithIds,
      topPrediction: topPredictionDoc ? topPredictionDoc._id : null,
      precautions: finalPrecautions,
      selfCareGuidelines:
        aiResult.selfCareGuidelines ||
        (topPredictionDoc ? topPredictionDoc.treatmentGuidelines : 'Please consult a doctor.'),
      isEmergency: aiResult.isEmergency || false,
      urgencyLevel: safeUrgency, // ✅ Safe urgency use karein
      modelVersion: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
      status: aiResult.isEmergency ? 'emergency' : 'completed',
    });

    // Response
    res.status(201).json({
      success: true,
      message: 'Disease prediction completed successfully',
      data: {
        predictionId: prediction._id,
        symptoms: prediction.symptoms,
        predictedDiseases: prediction.predictedDiseases.map((p) => ({
          diseaseName: p.diseaseName,
          confidence: p.confidence,
          confidencePercentage: `${(p.confidence * 100).toFixed(1)}%`,
          reasoning: p.reasoning,
          causes: p.causes || [],
          riskFactors: p.riskFactors || [],
        })),
        topPrediction: prediction.predictedDiseases[0]?.diseaseName || null,
        precautions: prediction.precautions,
        selfCareGuidelines: prediction.selfCareGuidelines,
        isEmergency: prediction.isEmergency,
        urgencyLevel: prediction.urgencyLevel,
        modelVersion: prediction.modelVersion,
        createdAt: prediction.createdAt,
      },
    });
  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
    });
  }
};

// ═══════════════════════════════════════════════
// SRS-61: Get User's Prediction History
// GET /api/prediction/history
// ═══════════════════════════════════════════════
const getPredictionHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const predictions = await Prediction.find({ patientId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v');

    const total = await Prediction.countDocuments({ patientId: req.user._id });

    res.status(200).json({
      success: true,
      message: 'Prediction history fetched successfully',
      data: {
        predictions,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalPredictions: total,
          limit,
        },
      },
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
    });
  }
};

// ═══════════════════════════════════════════════
// Get Single Prediction Details
// GET /api/prediction/:id
// ═══════════════════════════════════════════════
const getPredictionById = async (req, res) => {
  try {
    const prediction = await Prediction.findOne({
      _id: req.params.id,
      patientId: req.user._id,
    })
      .populate('topPrediction', 'diseaseName description')
      .select('-__v');

    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: 'Prediction not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Prediction fetched successfully',
      data: prediction,
    });
  } catch (error) {
    console.error('Get prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
    });
  }
};

module.exports = {
  predictFromSymptoms,
  getPredictionHistory,
  getPredictionById,
};