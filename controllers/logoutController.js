// DPDRS Backend - Logout Controller
// SRS-08: Logout User

const logoutUser = async (req, res) => {
  try {
    // JWT is stateless — client ko token remove karna hai
    res.status(200).json({
      success: true,
      message: 'Logout successful. Please remove token from client storage.',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
    });
  }
};

module.exports = { logoutUser };