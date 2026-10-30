// DPDRS Backend - Gemini AI Client (Strict & Fixed)
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    timeout: 60000,
    retryOptions: {
      attempts: 3,
      initialDelay: 1,
      maxDelay: 6,
      expBase: 2,
      jitter: 0.3,
      httpStatusCodes: [408, 500, 502, 503, 504],
    },
  },
});
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.6-flash';

class SymptomValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SymptomValidationError';
    this.statusCode = 400;
  }
}



class GeminiQuotaError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GeminiQuotaError';
    this.statusCode = 429;
  }
}
class PredictionNoMatchError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PredictionNoMatchError';
    this.statusCode = 422;
  }
}
function buildPrompt(symptoms, diseasesReference) {
  const diseaseList = (diseasesReference || []).map((d) => ({
    name: d.diseaseName,
    symptoms: (d.symptoms || []).slice(0, 20),
  }));
  const allowedNames = diseaseList.map((d) => d.name);

  return `You are a cautious symptom-matching assistant, not a doctor.
Patient-reported symptoms only: ${JSON.stringify(symptoms)}
Allowed disease names (choose exact names only): ${JSON.stringify(allowedNames)}
Reference data: ${JSON.stringify(diseaseList)}

Rules:
- Return only diseases whose exact name appears in Allowed disease names. Never invent or rename a disease.
- Do not infer addiction, drug abuse, or a substance-use disorder from physical symptoms such as rash or abdominal pain. Only consider these if the patient explicitly reports relevant substance use or dependence.
- Do not label a rash and abdominal pain alone as an allergy; allergy requires a relevant exposure/history or stronger allergy-specific evidence.
- If the symptoms do not support a reliable match, return an empty predictedDiseases array. Do not guess.
- Treat all results as possibilities, never as a confirmed diagnosis. Keep confidence conservative.

Return ONLY JSON:
{
  "predictedDiseases": [
    { "diseaseName": "exact name from allowed list", "confidence": 0.5, "reasoning": "...", "causes": [], "riskFactors": [] }
  ],
  "urgencyLevel": "low",
  "isEmergency": false,
  "precautions": [],
  "selfCareGuidelines": "..."
}`;
}

function extractJSON(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
}

async function predictDisease(symptoms, diseasesReference) {
  // ✅ 1. Basic Check (Length aur Letters)
  for (let sym of symptoms) {
    if (sym.length < 3 || !/^[a-z\s_]+$/.test(sym)) {
      throw new SymptomValidationError(`"${sym}" is not a valid medical symptom. Please enter valid symptoms like fever, cough, etc.`);
    }
  }

  // Accept symptoms shown by the app even when the imported disease dataset
  // does not contain their exact wording. Custom symptoms still need a DB match.
  const commonSymptoms = new Set([
    'fever', 'cough', 'headache', 'fatigue', 'sore throat',
    'shortness of breath', 'chest pain', 'nausea', 'vomiting',
    'diarrhea', 'abdominal pain', 'rash', 'joint pain', 'muscle pain',
    'dizziness', 'loss of appetite', 'chills', 'sweating', 'runny nose', 'sneezing',
  ]);
  const allDbSymptoms = diseasesReference.flatMap((d) =>
    (d.symptoms || []).map((s) => s.toLowerCase().replace(/_/g, ' ').trim())
  );

  for (const sym of symptoms) {
    const normalizedSym = sym.toLowerCase().replace(/_/g, ' ').trim();
    const isKnown = commonSymptoms.has(normalizedSym) || allDbSymptoms.some((dbSym) =>
      dbSym === normalizedSym || dbSym.includes(normalizedSym) || normalizedSym.includes(dbSym)
    );

    if (!isKnown) {
      throw new SymptomValidationError(
        `"${normalizedSym}" is not recognized in our medical database. Please use standard symptoms like fever, cough, etc.`
      );
    }
  }

  try {
    console.log(`🤖 Valid symptoms. Asking Gemini for prediction...`);
    const prompt = buildPrompt(symptoms, diseasesReference);
    let response;
    try {
      response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: { responseMimeType: 'application/json', temperature: 0.2 },
      });
    } catch (primaryError) {
      const status = primaryError.status ?? primaryError.code ?? primaryError.error?.code ?? primaryError.error?.status;
      const message = String(primaryError.message || '').toLowerCase();
      const quotaExceeded = status === 429 || status === 'RESOURCE_EXHAUSTED'
        || message.includes('quota exceeded') || message.includes('per day limit exceeded');
      if (quotaExceeded) {
        const retryAfter = String(primaryError.message || '').match(/Please retry in\s+([0-9hms.]+)/i)?.[1];
        throw new GeminiQuotaError(retryAfter
          ? `Gemini quota is exhausted. Please try again in ${retryAfter}.`
          : 'Gemini quota or rate limit is exhausted. Please wait for the quota reset and try again.');
      }

      const retryable = [408, 500, 502, 503, 504, 'UNAVAILABLE'].includes(status)
        || message.includes('timeout') || message.includes('timed out') || message.includes('temporarily unavailable');

      if (!retryable || FALLBACK_MODEL === MODEL_NAME) throw primaryError;
      console.warn(`Gemini ${MODEL_NAME} unavailable; trying fallback model ${FALLBACK_MODEL}.`);
      response = await ai.models.generateContent({
        model: FALLBACK_MODEL,
        contents: prompt,
        config: { responseMimeType: 'application/json', temperature: 0.2 },
      });
    }

    const prediction = extractJSON(response.text);
    const allowedDiseases = new Map(
      diseasesReference.map((disease) => [disease.diseaseName.trim().toLowerCase(), disease.diseaseName])
    );
    const hasSubstanceUseContext = symptoms.some((symptom) =>
      /\b(drug use|substance use|drug dependence|withdrawal|intoxication)\b/i.test(symptom)
    );
    const hasAllergySpecificEvidence = symptoms.some((symptom) =>
      /\b(hives|itching|itchy|swelling|wheezing|allergic reaction)\b/i.test(symptom)
    );

    prediction.predictedDiseases = (Array.isArray(prediction.predictedDiseases) ? prediction.predictedDiseases : [])
      .map((item) => {
        const submittedName = String(item?.diseaseName || '').trim().toLowerCase();
        const matchedName = allowedDiseases.get(submittedName);
        if (!matchedName) return null;
        if (/addiction|drug abuse|substance use/i.test(matchedName) && !hasSubstanceUseContext) return null;
        if (/allerg/i.test(matchedName) && !hasAllergySpecificEvidence) return null;
        const confidence = Number(item.confidence);
        return {
          ...item,
          diseaseName: matchedName,
          confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);

    if (prediction.predictedDiseases.length === 0) {
      throw new PredictionNoMatchError(
        'These symptoms are not enough for a reliable match in our database. Please consult a doctor or add more relevant details.'
      );
    }

    return prediction;
  } catch (error) {
    if (error.name !== 'GeminiQuotaError' && (error.status === 429 || error.status === 'RESOURCE_EXHAUSTED')) {
      const retryAfter = String(error.message || '').match(/Please retry in\s+([0-9hms.]+)/i)?.[1];
      error = new GeminiQuotaError(retryAfter
        ? `Gemini quota is exhausted. Please try again in ${retryAfter}.`
        : 'Gemini quota or rate limit is exhausted. Please wait for the quota reset and try again.');
    }
    console.error('Gemini request failed:', {
      message: error.message,
      status: error.status ?? error.response?.status,
      code: error.code ?? error.cause?.code,
      cause: error.cause?.message,
    });
    throw error; 
  }
}

module.exports = { predictDisease, SymptomValidationError, PredictionNoMatchError, GeminiQuotaError };
