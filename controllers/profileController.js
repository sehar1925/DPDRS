// DPDRS Backend - Profile Controller
// SRS-09 to SRS-16: Profile Management

const User = require('../models/User');

// ═══════════════════════════════════════════════
// SRS-09, SRS-10: View Profile
// GET /api/profile/me
// Only authenticated users can access (SRS-10)
// ═══════════════════════════════════════════════
const getProfile = async (req, res) => {
  try {
    // req.user is set by `protect` middleware (SRS-10)
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile fetched successfully',
      data: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        age: user.age,
        gender: user.gender,
        role: user.role,
        phone: user.phone,
        profilePicture: user.profilePicture,
        isActive: user.isActive,
        accountStatus: user.accountStatus,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
    });
  }
};

// ═══════════════════════════════════════════════
// SRS-11, SRS-12: Update Profile
// PUT /api/profile/update
// Validates data before saving (SRS-12)
// ═══════════════════════════════════════════════
const updateProfile = async (req, res) => {
  try {
    const { fullName, age, gender, phone, profilePicture } = req.body;

    // ─── SRS-12: Validate input ───
    if (!fullName && !age && !gender && !phone && !profilePicture) {
      return res.status(400).json({
        success: false,
        message: 'At least one field is required to update',
      });
    }

    // Validate fullName if provided
    if (fullName !== undefined) {
      if (fullName.trim().length < 3 || fullName.trim().length > 50) {
        return res.status(400).json({
          success: false,
          message: 'Full name must be between 3 and 50 characters',
        });
      }
    }

    // Validate age if provided
    if (age !== undefined) {
      if (age < 1 || age > 120) {
        return res.status(400).json({
          success: false,
          message: 'Age must be between 1 and 120',
        });
      }
    }

    // Validate gender if provided
    if (gender !== undefined) {
      if (!['male', 'female', 'other'].includes(gender.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: 'Gender must be male, female, or other',
        });
      }
    }

    // ─── SRS-16: Prevent unauthorized access ───
    // User can only update their own profile (req.user._id from token)
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // ─── SRS-11: Update allowed fields ───
    // Note: email, password, role are NOT updatable here for security
    if (fullName !== undefined) user.fullName = fullName.trim();
    if (age !== undefined) user.age = age;
    if (gender !== undefined) user.gender = gender.toLowerCase();
    if (phone !== undefined) user.phone = phone;
    if (profilePicture !== undefined) user.profilePicture = profilePicture;

    // SRS-14, SRS-15: Save to database, timestamps auto-update
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        age: user.age,
        gender: user.gender,
        role: user.role,
        phone: user.phone,
        profilePicture: user.profilePicture,
        updatedAt: user.updatedAt,
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
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
    });
  }
};

module.exports = { getProfile, updateProfile };