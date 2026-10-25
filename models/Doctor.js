// DPDRS Backend - Doctor Model
// SRS 2.1.5: Verify Doctor Accounts
// SRS-42 to SRS-57: Doctor Recommendation

const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      unique: true,
    },
    
    fullName: {
      type: String,
      required: [true, 'Doctor name is required'],
      trim: true,
    },
    
    specialization: {
      type: String,
      required: [true, 'Specialization is required'],
      enum: [
        'Cardiologist', 'Dermatologist', 'Gastroenterologist', 
        'Neurologist', 'Pediatrician', 'Psychiatrist', 
        'General Physician', 'Gynecologist', 'Orthopedic', 
        'ENT Specialist', 'Ophthalmologist', 'Pulmonologist'
      ],
    },
    
    degrees: {
      type: [String],
      default: [],
    },
    
    licenseNumber: {
      type: String,
      required: [true, 'License number is required'],
      unique: true,
    },
    
    yearsOfExperience: {
      type: Number,
      required: [true, 'Experience is required'],
      min: [0, 'Experience cannot be negative'],
    },
    
    consultationFee: {
      type: Number,
      required: [true, 'Consultation fee is required'],
      min: [0, 'Fee cannot be negative'],
    },
    
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected', 'suspended'],
      default: 'pending',
    },
    
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    
    clinicAddress: {
      type: String,
      required: [true, 'Clinic address is required'],
    },
    city: {
      type: String,
      required: [true, 'City is required'],
    },
    
    availability: {
      workingDays: { type: [String], default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '17:00' },
    },
    
    offersOnline: {
      type: Boolean,
      default: true,
    },
    offersInPerson: {
      type: Boolean,
      default: true,
    },
    
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Doctor', doctorSchema);