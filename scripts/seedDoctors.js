// DPDRS Backend - Seed Doctors Data
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Doctor = require('../models/Doctor');

const seedDoctors = async () => {
  await connectDB();

  try {
    await Doctor.deleteMany({});
    console.log('🗑️ Old doctors deleted.');

    const doctorsData = [
      { name: 'Dr. Ahmed Khan', spec: 'General Physician', exp: 10, fee: 1000, city: 'Karachi', license: 'LIC-GP-001' },
      { name: 'Dr. Sarah Ali', spec: 'Cardiologist', exp: 15, fee: 3000, city: 'Lahore', license: 'LIC-CARD-002' },
      { name: 'Dr. Usman Malik', spec: 'Dermatologist', exp: 8, fee: 2000, city: 'Islamabad', license: 'LIC-DERM-003' },
      { name: 'Dr. Ayesha Siddiqui', spec: 'Gastroenterologist', exp: 12, fee: 2500, city: 'Karachi', license: 'LIC-GASTRO-004' },
      { name: 'Dr. Bilal Ahmed', spec: 'Neurologist', exp: 20, fee: 4000, city: 'Lahore', license: 'LIC-NEURO-005' },
      { name: 'Dr. Fatima Noor', spec: 'Pediatrician', exp: 7, fee: 1500, city: 'Islamabad', license: 'LIC-PEDIA-006' },
      { name: 'Dr. Zainab Raza', spec: 'Psychiatrist', exp: 10, fee: 2500, city: 'Karachi', license: 'LIC-PSY-007' },
      { name: 'Dr. Hamza Tariq', spec: 'Orthopedic', exp: 14, fee: 3000, city: 'Lahore', license: 'LIC-ORTHO-008' },
      { name: 'Dr. Sana Aslam', spec: 'Gynecologist', exp: 9, fee: 2000, city: 'Multan', license: 'LIC-GYN-009' },
      { name: 'Dr. Imran Yousaf', spec: 'Pulmonologist', exp: 11, fee: 2200, city: 'Islamabad', license: 'LIC-PULM-010' },
    ];

    const createdDoctors = [];

    for (let i = 0; i < doctorsData.length; i++) {
      const d = doctorsData[i];
      const email = `doctor${i + 1}@dpdrs.com`;

      let user = await User.findOne({ email });
      if (!user) {
        user = await User.create({
          fullName: d.name,
          email: email,
          password: 'Doctor@2026',
          age: 30 + d.exp,
          gender: i % 2 === 0 ? 'male' : 'female',
          role: 'doctor',
        });
      }

      const doctorProfile = await Doctor.create({
        userId: user._id,
        fullName: d.name,
        specialization: d.spec,
        degrees: ['MBBS', 'FCPS'],
        licenseNumber: d.license,
        yearsOfExperience: d.exp,
        consultationFee: d.fee,
        city: d.city,
        clinicAddress: `Clinic ${i + 1}, Medical Center, ${d.city}`,
        verificationStatus: 'verified', // ✅ Sabhi verified hain taake test mein dikhein
        rating: (Math.random() * (5 - 3.5) + 3.5).toFixed(1),
        totalReviews: Math.floor(Math.random() * 50) + 10,
        availability: {
          workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
          startTime: '09:00',
          endTime: '17:00',
        },
        offersOnline: true,
        offersInPerson: true,
      });

      createdDoctors.push(doctorProfile);
    }

    console.log(`✅ Successfully inserted ${createdDoctors.length} doctors.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding doctors:', error);
    process.exit(1);
  }
};

seedDoctors();
