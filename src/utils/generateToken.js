


export const sendTokenResponse = (user, statusCode, res) => {
  // Generate JWT token
  const token = user.getSignedJwtToken();

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      avatar: user.avatar
    }
  });
};

export default sendTokenResponse;
