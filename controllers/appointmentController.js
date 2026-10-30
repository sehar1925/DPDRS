// DPDRS Backend - Appointment Controller
// SRS-58 to SRS-69
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');

// SRS-58 to SRS-60: Book Appointment
const bookAppointment = async (req, res) => {
  try {
    const { doctorId, appointmentDate, timeSlot, mode, symptoms } = req.body;

    if (!doctorId || !appointmentDate || !timeSlot || !mode) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    // Validate date-only input strictly before using it in any MongoDB query.
    const dateMatch = typeof appointmentDate === 'string'
      ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(appointmentDate)
      : null;
    if (!dateMatch) {
      return res.status(400).json({ success: false, message: 'Please provide a valid date in YYYY-MM-DD format.' });
    }

    const [, yearText, monthText, dayText] = dateMatch;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const parsedDate = new Date(Date.UTC(year, month - 1, day));
    const isRealDate = year >= 1000
      && parsedDate.getUTCFullYear() === year
      && parsedDate.getUTCMonth() === month - 1
      && parsedDate.getUTCDate() === day;

    if (!isRealDate) {
      return res.status(400).json({ success: false, message: 'Please provide a real calendar date in YYYY-MM-DD format.' });
    }

    // Double Booking Check
    const existingAppointment = await Appointment.findOne({
      doctorId,
      appointmentDate: parsedDate,
      timeSlot,
      status: { $in: ['pending', 'confirmed'] },
    });

    if (existingAppointment) {
      return res.status(400).json({ success: false, message: 'This time slot is already booked. Please choose another.' });
    }

    const visitToken = mode === 'in-person' ? `TKN-${Math.floor(1000 + Math.random() * 9000)}` : null;

    const appointment = await Appointment.create({
      patientId: req.user._id,
      doctorId,
      appointmentDate: parsedDate,
      timeSlot,
      mode,
      symptoms: symptoms || [],
      patientName: req.user.fullName,
      patientAge: req.user.age,
      patientGender: req.user.gender,
      visitToken,
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      data: appointment,
    });
  } catch (error) {
    console.error('Booking error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Time slot already booked' });
    }
    res.status(500).json({ success: false, message: 'Server error while booking' });
  }
};
// SRS-61, 62, 63: Manage Appointments (View & Cancel)
const getMyAppointments = async (req, res) => {
  try {
    // ✅ Doctor ka data properly populate karein
    const appointments = await Appointment.find({ patientId: req.user._id })
      .populate({
        path: 'doctorId',
        select: 'fullName specialization city clinicAddress consultationFee',
      })
      .sort({ appointmentDate: -1 }); // Newest first

    res.status(200).json({
      success: true,
      data: appointments,
    });
  } catch (error) {
    console.error('Fetch appointments error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching appointments' });
  }
};

const cancelAppointment = async (req, res) => {
  try {
    console.log("Cancelling Appointment ID:", req.params.id); // ✅ Debugging ke liye
    
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      patientId: req.user._id, 
    });

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found or you are not authorized.' });
    }

    if (appointment.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'This appointment is already cancelled.' });
    }

    appointment.status = 'cancelled';
    await appointment.save();

    res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully',
      data: appointment,
    });
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({ success: false, message: 'Server error cancelling appointment' });
  }
};

module.exports = { bookAppointment, getMyAppointments, cancelAppointment };