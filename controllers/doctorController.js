// DPDRS Backend - Doctor Controller
// SRS-42 to SRS-57: Doctor Recommendation

const Doctor = require('../models/Doctor');

// ═══════════════════════════════════════════════
// Disease to Specialization Mapping
// SRS-43, SRS-44: Match Specialists
// ═══════════════════════════════════════════════
const DISEASE_SPECIALIST_MAP = {
  // Respiratory
  'common cold': 'General Physician',
  'flu': 'General Physician',
  'influenza': 'General Physician',
  'covid-19': 'Pulmonologist',
  'pneumonia': 'Pulmonologist',
  'acute bronchitis': 'Pulmonologist',
  'asthma': 'Pulmonologist',
  'tuberculosis': 'Pulmonologist',
  'copd': 'Pulmonologist',

  // Cardiac
  'heart attack': 'Cardiologist',
  'angina': 'Cardiologist',
  'heart failure': 'Cardiologist',
  'hypertension': 'Cardiologist',
  'arrhythmia': 'Cardiologist',

  // Skin
  'acne': 'Dermatologist',
  'eczema': 'Dermatologist',
  'psoriasis': 'Dermatologist',
  'skin infection': 'Dermatologist',
  'skin pigmentation disorder': 'Dermatologist',

  // Gastric
  'gastritis': 'Gastroenterologist',
  'ulcer': 'Gastroenterologist',
  'gastroenteritis': 'Gastroenterologist',
  'food poisoning': 'Gastroenterologist',
  'gastrointestinal hemorrhage': 'Gastroenterologist',
  'cholecystitis': 'Gastroenterologist',
  'gallstone': 'Gastroenterologist',
  'esophagitis': 'Gastroenterologist',

  // Neuro
  'migraine': 'Neurologist',
  'epilepsy': 'Neurologist',
  'stroke': 'Neurologist',
  'parkinson': 'Neurologist',
  'multiple sclerosis': 'Neurologist',

  // Mental Health
  'depression': 'Psychiatrist',
  'anxiety': 'Psychiatrist',
  'panic disorder': 'Psychiatrist',
  'schizophrenia': 'Psychiatrist',
  'bipolar': 'Psychiatrist',

  // Orthopedic
  'arthritis': 'Orthopedic',
  'arthritis of the hip': 'Orthopedic',
  'fracture': 'Orthopedic',
  'back pain': 'Orthopedic',
  'osteoporosis': 'Orthopedic',

  // Gynecologist
  'vaginitis': 'Gynecologist',
  'pelvic inflammatory disease': 'Gynecologist',
  'threatened pregnancy': 'Gynecologist',
  'vulvodynia': 'Gynecologist',
  'pcos': 'Gynecologist',

  // Pediatric (for children's diseases)
  'measles': 'Pediatrician',
  'chickenpox': 'Pediatrician',
  'croup': 'Pediatrician',

  // ENT
  'sinusitis': 'ENT Specialist',
  'otitis media': 'ENT Specialist',
  'tonsillitis': 'ENT Specialist',

  // Eye
  'conjunctivitis': 'Ophthalmologist',
  'macular degeneration': 'Ophthalmologist',
  'cornea infection': 'Ophthalmologist',
};

// ═══════════════════════════════════════════════
// SRS-42 to 48: Recommend Doctors by Disease
// POST /api/doctors/recommend
// ═══════════════════════════════════════════════
const recommendDoctors = async (req, res) => {
  try {
    const { diseaseName, city } = req.body;

    if (!diseaseName) {
      return res.status(400).json({
        success: false,
        message: 'Disease name is required',
      });
    }

    // Step 1: Map disease to specialist
    const normalizedDisease = diseaseName.toLowerCase().trim();
    let requiredSpecialization = DISEASE_SPECIALIST_MAP[normalizedDisease];

    // Agar exact match nahi mila, toh partial search karo
    if (!requiredSpecialization) {
      for (const [key, spec] of Object.entries(DISEASE_SPECIALIST_MAP)) {
        if (normalizedDisease.includes(key) || key.includes(normalizedDisease)) {
          requiredSpecialization = spec;
          break;
        }
      }
    }

    // Fallback
    if (!requiredSpecialization) {
      requiredSpecialization = 'General Physician';
    }

    console.log(`🔍 Disease: "${diseaseName}" → Specialist: ${requiredSpecialization}`);

    // Step 2: Query doctors
    const query = {
      specialization: requiredSpecialization,
      verificationStatus: 'verified', // SRS: Sirf verified doctors
      isAvailable: true,
    };

    // Optional city filter
    if (city) {
      query.city = { $regex: new RegExp(city, 'i') };
    }

    const doctors = await Doctor.find(query).sort({ rating: -1 }); // Highest rating first

    res.status(200).json({
      success: true,
      message: doctors.length > 0 
        ? `Found ${doctors.length} doctors for "${diseaseName}"` 
        : `No ${requiredSpecialization} available. Showing all available doctors.`,
      data: {
        recommendedSpecialist: requiredSpecialization,
        totalDoctors: doctors.length,
        doctors: doctors.map((doc) => ({
          id: doc._id,
          fullName: doc.fullName,
          specialization: doc.specialization,
          degrees: doc.degrees,
          yearsOfExperience: doc.yearsOfExperience,
          consultationFee: doc.consultationFee,
          rating: doc.rating,
          totalReviews: doc.totalReviews,
          city: doc.city,
          clinicAddress: doc.clinicAddress,
          availability: doc.availability,
          offersOnline: doc.offersOnline,
          offersInPerson: doc.offersInPerson,
        })),
      },
    });
  } catch (error) {
    console.error('Recommend doctors error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
    });
  }
};

// ═══════════════════════════════════════════════
// Get All Doctors (with filters)
// GET /api/doctors
// ═══════════════════════════════════════════════
const getAllDoctors = async (req, res) => {
  try {
    const { specialization, city } = req.query;

    const query = { verificationStatus: 'verified' };
    if (specialization) query.specialization = specialization;
    if (city) query.city = { $regex: new RegExp(city, 'i') };

    const doctors = await Doctor.find(query).sort({ rating: -1 });

    res.status(200).json({
      success: true,
      message: `${doctors.length} doctors found`,
      data: doctors,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = { recommendDoctors, getAllDoctors };