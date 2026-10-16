// DPDRS Backend - Gemini API Client
// Handles AI-powered disease prediction using Google Gemini 3.8 Flash
// SRS-31 to SRS-41: Intelligent Disease Prediction
// With auto-retry logic for 503 (busy) errors

const { GoogleGenAI } = require('@google/genai');

// Initialize Gemini client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MODEL_NAME = 'gemini-3.8-flash';

// ═══════════════════════════════════════════════
// Build prompt for Gemini with disease reference data
// ═══════════════════════════════════════════════
function buildPrompt(symptoms, diseasesReference) {
  // Prepare compact disease reference (to save tokens)
  const diseaseList = diseasesReference.map((d) => ({
    name: d.diseaseName,
    symptoms: d.symptoms.slice(0, 30),
    severity: d.severity,
  }));

  return `You are a medical AI assistant for the Disease Prediction and Doctor Recommendation System (DPDRS).

TASK: Analyze the patient's symptoms and predict the most likely diseases.

PATIENT SYMPTOMS:
${symptoms.map((s, i) => `${i + 1}. ${s}`).join('\n')}

REFERENCE DISEASES DATABASE (100 diseases):
${JSON.stringify(diseaseList, null, 2)}

INSTRUCTIONS:
1. Match the patient's symptoms against the reference database
2. Return the TOP 3 most likely diseases with confidence scores (0.0 to 1.0)
3. For each disease, provide brief reasoning
4. Determine urgency level: "low", "medium", "high", or "critical"
5. Set isEmergency to true if symptoms suggest a life-threatening condition
6. Provide 3-5 relevant precautions
7. Provide general self-care guidelines

CRITICAL: Return ONLY valid JSON, no markdown, no explanation, no code blocks.

Expected JSON format:
{
  "predictedDiseases": [
    {
      "diseaseName": "exact disease name from reference",
      "confidence": 0.85,
      "reasoning": "brief explanation"
    }
  ],
  "urgencyLevel": "medium",
  "isEmergency": false,
  "precautions": ["precaution 1", "precaution 2", "precaution 3"],
  "selfCareGuidelines": "general advice text"
}`;
}

// ═══════════════════════════════════════════════
// Extract JSON from Gemini response
// ═══════════════════════════════════════════════
function extractJSON(text) {
  let cleaned = text.trim();

  // Remove markdown code blocks if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  }

  // Find first { and last }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error('No JSON found in Gemini response');
  }

  const jsonStr = cleaned.substring(firstBrace, lastBrace + 1);
  return JSON.parse(jsonStr);
}

// ═══════════════════════════════════════════════
// Main prediction function WITH RETRY LOGIC
// ═══════════════════════════════════════════════
async function predictDisease(symptoms, diseasesReference, maxRetries = 3) {
  // Validate inputs
  if (!symptoms || symptoms.length === 0) {
    throw new Error('At least one symptom is required');
  }

  if (!diseasesReference || diseasesReference.length === 0) {
    throw new Error('Disease reference database is empty');
  }

  const prompt = buildPrompt(symptoms, diseasesReference);

  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🤖 Gemini API attempt ${attempt}/${maxRetries}...`);

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
      });

      const responseText = response.text;

      if (!responseText) {
        throw new Error('Empty response from Gemini API');
      }

      console.log('✅ Gemini response received');

      const prediction = extractJSON(responseText);

      if (!prediction.predictedDiseases || !Array.isArray(prediction.predictedDiseases)) {
        throw new Error('Invalid response: predictedDiseases missing');
      }

      // Sort by confidence (highest first)
      prediction.predictedDiseases.sort((a, b) => b.confidence - a.confidence);

      // Limit to top 3
      prediction.predictedDiseases = prediction.predictedDiseases.slice(0, 3);

      // Ensure all required fields
      prediction.urgencyLevel = prediction.urgencyLevel || 'low';
      prediction.isEmergency = prediction.isEmergency || false;
      prediction.precautions = prediction.precautions || [];
      prediction.selfCareGuidelines = prediction.selfCareGuidelines || '';

      return prediction;
    } catch (error) {
      lastError = error;
      console.log(`⚠️ Attempt ${attempt} failed: ${error.message.substring(0, 100)}`);

      // If we have retries left, wait and retry
      if (attempt < maxRetries) {
        const waitTime = attempt * 5000; // 5s, 10s
        console.log(`⏳ Waiting ${waitTime / 1000}s before retry...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  console.error('❌ All Gemini API attempts failed');
  throw lastError;
}

module.exports = { predictDisease };