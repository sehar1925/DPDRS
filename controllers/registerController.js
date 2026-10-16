// DPDRS Backend - Register Controller
// SRS-01 to SRS-04: Register User

const User = require('../models/User');

const registerUser = async (req, res) => {
  try {
    const { fullName, email, password, age, gender } = req.body;

    // Validate fields
    if (!fullName || !email || !password || !age || !gender) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: fullName, email, password, age, gender',
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered. Please login instead.',
      });
    }

    // Create user (password auto-hashed by pre-save hook)
    const user = await User.create({ fullName, email, password, age, gender });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        age: user.age,
        gender: user.gender,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages,
      });
    }
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered',
      });
    }
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
    });
  }
};

module.exports = { registerUser };