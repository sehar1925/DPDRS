// DPDRS Backend - Seed Doctors Data (Expanded)
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
      // General Physician (3)
      { name: 'Dr. Ahmed Khan', spec: 'General Physician', exp: 10, fee: 1000, city: 'Karachi', license: 'LIC-GP-001' },
      { name: 'Dr. Salman Yousuf', spec: 'General Physician', exp: 8, fee: 800, city: 'Lahore', license: 'LIC-GP-002' },
      { name: 'Dr. Nida Fatima', spec: 'General Physician', exp: 12, fee: 1200, city: 'Islamabad', license: 'LIC-GP-003' },
      
      // Cardiologist (2)
      { name: 'Dr. Sarah Ali', spec: 'Cardiologist', exp: 15, fee: 3000, city: 'Lahore', license: 'LIC-CARD-002' },
      { name: 'Dr. Asad Mehmood', spec: 'Cardiologist', exp: 18, fee: 3500, city: 'Karachi', license: 'LIC-CARD-011' },
      
      // Dermatologist (2)
      { name: 'Dr. Usman Malik', spec: 'Dermatologist', exp: 8, fee: 2000, city: 'Islamabad', license: 'LIC-DERM-003' },
      { name: 'Dr. Hina Rashid', spec: 'Dermatologist', exp: 11, fee: 2200, city: 'Lahore', license: 'LIC-DERM-012' },
      
      // Gastroenterologist (2)
      { name: 'Dr. Ayesha Siddiqui', spec: 'Gastroenterologist', exp: 12, fee: 2500, city: 'Karachi', license: 'LIC-GASTRO-004' },
      { name: 'Dr. Faisal Raza', spec: 'Gastroenterologist', exp: 14, fee: 2800, city: 'Islamabad', license: 'LIC-GASTRO-013' },
      
      // Neurologist (2)
      { name: 'Dr. Bilal Ahmed', spec: 'Neurologist', exp: 20, fee: 4000, city: 'Lahore', license: 'LIC-NEURO-005' },
      { name: 'Dr. Sana Tariq', spec: 'Neurologist', exp: 16, fee: 3800, city: 'Karachi', license: 'LIC-NEURO-014' },

      // Pediatrician (2)
      { name: 'Dr. Fatima Noor', spec: 'Pediatrician', exp: 7, fee: 1500, city: 'Islamabad', license: 'LIC-PEDIA-006' },
      { name: 'Dr. Ali Haider', spec: 'Pediatrician', exp: 9, fee: 1600, city: 'Multan', license: 'LIC-PEDIA-015' },

      // Psychiatrist (2)
      { name: 'Dr. Zainab Raza', spec: 'Psychiatrist', exp: 10, fee: 2500, city: 'Karachi', license: 'LIC-PSY-007' },
      { name: 'Dr. Kamran Akmal', spec: 'Psychiatrist', exp: 13, fee: 2800, city: 'Lahore', license: 'LIC-PSY-016' },

      // Orthopedic (2)
      { name: 'Dr. Hamza Tariq', spec: 'Orthopedic', exp: 14, fee: 3000, city: 'Lahore', license: 'LIC-ORTHO-008' },
      { name: 'Dr. Rabia Aslam', spec: 'Orthopedic', exp: 10, fee: 2500, city: 'Karachi', license: 'LIC-ORTHO-017' },

      // Gynecologist (2)
      { name: 'Dr. Sana Aslam', spec: 'Gynecologist', exp: 9, fee: 2000, city: 'Multan', license: 'LIC-GYN-009' },
      { name: 'Dr. Maria Khan', spec: 'Gynecologist', exp: 15, fee: 3000, city: 'Karachi', license: 'LIC-GYN-018' },

      // Pulmonologist (2)
      { name: 'Dr. Imran Yousaf', spec: 'Pulmonologist', exp: 11, fee: 2200, city: 'Islamabad', license: 'LIC-PULM-010' },
      { name: 'Dr. Mehwish Ali', spec: 'Pulmonologist', exp: 9, fee: 2000, city: 'Lahore', license: 'LIC-PULM-019' },
      
      // ENT Specialist (2)
      { name: 'Dr. Adnan Sheikh', spec: 'ENT Specialist', exp: 10, fee: 2000, city: 'Karachi', license: 'LIC-ENT-020' },
      { name: 'Dr. Saba Qureshi', spec: 'ENT Specialist', exp: 8, fee: 1800, city: 'Islamabad', license: 'LIC-ENT-021' },

      // Ophthalmologist (2)
      { name: 'Dr. Tariq Jameel', spec: 'Ophthalmologist', exp: 13, fee: 2500, city: 'Lahore', license: 'LIC-OPTH-022' },
      { name: 'Dr. Nadia Hussain', spec: 'Ophthalmologist', exp: 11, fee: 2200, city: 'Karachi', license: 'LIC-OPTH-023' },
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
        verificationStatus: 'verified',
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