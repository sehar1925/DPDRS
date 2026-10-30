// DPDRS Backend - Appointment Routes
// SRS-58 to SRS-69: Appointment & Consultation

const express = require('express');
const router = express.Router();
const { bookAppointment, getMyAppointments, cancelAppointment } = require('../controllers/appointmentController');
const { protect } = require('../middleware/authMiddleware');

// SRS-58, 59, 60: Book Appointment
router.post('/book', protect, bookAppointment);

// SRS-61, 62, 63: View & Cancel
router.get('/my-appointments', protect, getMyAppointments);
router.put('/:id/cancel', protect, cancelAppointment);

module.exports = router;