// DPDRS Backend - Delete Account Controller
// SRS-125 to SRS-128: Delete User Account

const User = require('../models/User');

const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;

    // ─── SRS-126: Require password confirmation ───
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required to delete your account',
      });
    }

    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.accountStatus === 'deleted' || user.deletedAt) {
      return res.status(400).json({
        success: false,
        message: 'This account has already been deleted',
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Password is incorrect',
      });
    }

    // ─── SRS-127, SRS-128: Soft delete + audit trail ───
    user.isActive = false;
    user.accountStatus = 'deleted';
    user.deletedAt = new Date();

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully. We are sorry to see you go.',
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
    });
  }
};

module.exports = { deleteAccount };