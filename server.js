// DPDRS Backend - Main Server File

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');   // ← ADD
const predictionRoutes = require('./routes/predictionRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');

const app = express();

// MIDDLEWARE
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/prediction', predictionRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
                    

// TEST ROUTE
app.get('/', (req, res) => {
  res.json({
    message: 'DPDRS Backend is running',
    status: 'OK',
    timestamp: new Date().toISOString(),
  });
});

// START SERVER
const PORT = process.env.PORT || 5000;

connectDB();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`   Accessible at http://10.54.128.254:${PORT}`);
});;