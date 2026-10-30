// DPDRS Backend - Appointment Model
// SRS-58 to SRS-69: Appointment & Consultation

const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
    },
    // SRS-58: Date & Time
    appointmentDate: {
      type: Date,
      required: [true, 'Appointment date is required'],
    },
    timeSlot: {
      type: String, // e.g., "10:00 AM", "02:30 PM"
      required: [true, 'Time slot is required'],
    },
    // SRS-59: Mode of Consultation
    mode: {
      type: String,
      enum: ['online', 'in-person'],
      required: true,
    },
    // SRS-63: Status
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed'],
      default: 'pending',
    },
    // SRS-68: Visit Token for physical clinic
    visitToken: {
      type: String,
      default: null,
    },
    // Patient Details (snapshot at time of booking)
    patientName: String,
    patientAge: Number,
    patientGender: String,
    symptoms: [String],
  },
  { timestamps: true }
);

// SRS-69: Prevent Double Booking (same doctor, same date, same time)
appointmentSchema.index({ doctorId: 1, appointmentDate: 1, timeSlot: 1 }, { unique: true });

module.exports = mongoose.model('Appointment', appointmentSchema);