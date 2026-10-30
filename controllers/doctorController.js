// DPDRS Backend - Doctor Controller
// SRS-42 to SRS-57: Doctor Recommendation

const Doctor = require('../models/Doctor');

// ═══════════════════════════════════════════════
// Disease to Specialization Mapping
// ═══════════════════════════════════════════════
const DISEASE_SPECIALIST_MAP = {
  'common cold': 'General Physician',
  'flu': 'General Physician',
  'influenza': 'General Physician',
  'covid-19': 'Pulmonologist',
  'pneumonia': 'Pulmonologist',
  'acute bronchitis': 'Pulmonologist',
  'asthma': 'Pulmonologist',
  'tuberculosis': 'Pulmonologist',
  'copd': 'Pulmonologist',
  'heart attack': 'Cardiologist',
  'angina': 'Cardiologist',
  'heart failure': 'Cardiologist',
  'hypertension': 'Cardiologist',
  'arrhythmia': 'Cardiologist',
  'acne': 'Dermatologist',
  'eczema': 'Dermatologist',
  'psoriasis': 'Dermatologist',
  'skin infection': 'Dermatologist',
  'skin pigmentation disorder': 'Dermatologist',
  'gastritis': 'Gastroenterologist',
  'ulcer': 'Gastroenterologist',
  'gastroenteritis': 'Gastroenterologist',
  'food poisoning': 'Gastroenterologist',
  'gastrointestinal hemorrhage': 'Gastroenterologist',
  'cholecystitis': 'Gastroenterologist',
  'gallstone': 'Gastroenterologist',
  'esophagitis': 'Gastroenterologist',
  'migraine': 'Neurologist',
  'epilepsy': 'Neurologist',
  'stroke': 'Neurologist',
  'parkinson': 'Neurologist',
  'multiple sclerosis': 'Neurologist',
  'depression': 'Psychiatrist',
  'anxiety': 'Psychiatrist',
  'panic disorder': 'Psychiatrist',
  'schizophrenia': 'Psychiatrist',
  'bipolar': 'Psychiatrist',
  'arthritis': 'Orthopedic',
  'arthritis of the hip': 'Orthopedic',
  'fracture': 'Orthopedic',
  'back pain': 'Orthopedic',
  'osteoporosis': 'Orthopedic',
  'vaginitis': 'Gynecologist',
  'pelvic inflammatory disease': 'Gynecologist',
  'threatened pregnancy': 'Gynecologist',
  'vulvodynia': 'Gynecologist',
  'pcos': 'Gynecologist',
  'measles': 'Pediatrician',
  'chickenpox': 'Pediatrician',
  'croup': 'Pediatrician',
  'sinusitis': 'ENT Specialist',
  'otitis media': 'ENT Specialist',
  'tonsillitis': 'ENT Specialist',
  'conjunctivitis': 'Ophthalmologist',
  'macular degeneration': 'Ophthalmologist',
  'cornea infection': 'Ophthalmologist',
};

// ═══════════════════════════════════════════════
// SRS-42 to 48: Recommend Doctors by Disease/Search
// POST /api/doctors/recommend
// ═══════════════════════════════════════════════
const recommendDoctors = async (req, res) => {
  try {
    const { diseaseName, city, searchQuery, isGeneral } = req.body;

    // Base Query
    const query = {
      verificationStatus: 'verified',
      isAvailable: true,
    };

    // 1. City Filter
    if (city && city.trim() !== '') {
      query.city = { $regex: new RegExp(city, 'i') };
    }

    // 2. Search Query Filter (agar user ne search box mein kuch likha hai)
    if (searchQuery && searchQuery.trim() !== '') {
      query.$or = [
        { fullName: { $regex: searchQuery, $options: 'i' } },
        { specialization: { $regex: searchQuery, $options: 'i' } },
      ];
    } 
    // 3. Agar General mode nahi hai (yani disease specific hai) aur search khali hai
    else if (!isGeneral && diseaseName) {
      const normalizedDisease = diseaseName.toLowerCase().trim();
      let mappedSpecialist = DISEASE_SPECIALIST_MAP[normalizedDisease];

      if (!mappedSpecialist) {
        for (const [key, spec] of Object.entries(DISEASE_SPECIALIST_MAP)) {
          if (normalizedDisease.includes(key) || key.includes(normalizedDisease)) {
            mappedSpecialist = spec;
            break;
          }
        }
      }
      query.specialization = mappedSpecialist || 'General Physician';
    }

    const doctors = await Doctor.find(query).sort({ rating: -1 });

    // Response Data Format
    res.status(200).json({
      success: true,
      message: doctors.length > 0 ? `Found ${doctors.length} doctors` : `No doctors available matching your criteria.`,
      data: {
        recommendedSpecialist: isGeneral ? 'All Specialists' : (query.specialization || 'All Specialists'),
        totalDoctors: doctors.length,
        doctors: doctors.map((doc) => ({
          id: doc._id,
          fullName: doc.fullName,
          specialization: doc.specialization,
          degrees: doc.degrees || [],
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
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
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
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { recommendDoctors, getAllDoctors };