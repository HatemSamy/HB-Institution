import User from "../models/User.js";
import { sendEmail } from "../utils/email.js";
import crypto from 'crypto';
import sendTokenResponse from "../utils/generateToken.js";

export const registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    if (role && role.toLowerCase() === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to register as admin',
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    const allowedRoles = ['student', 'instructor'];
    const userRole = role && allowedRoles.includes(role) ? role : 'student';

    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: userRole,
    });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  if (user.isBlocked) {
    return res.status(403).json({
      success: false,
      message: 'Your account is blocked. Contact support.',
      blockedAt: user.blockedAt,
    });
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  sendTokenResponse(user, 200, res);
};

// export const forgotPassword = async (req, res) => {
//   const user = await User.findOne({ email: req.body.email });

//   if (!user) {
//     return res.status(404).json({ success: false, message: 'No user with that email' });
//   }

//   const resetToken = user.getResetPasswordToken();
//   await user.save({ validateBeforeSave: false });

//   const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

//   const message = `
//     <p>You requested a password reset</p>
//     <p>Click the link below to reset your password:</p>
//     <a href="${resetUrl}">${resetUrl}</a>
//   `;

//   try {
//     await sendEmail(user.email, 'Password Reset Request', message);
//     res.status(200).json({ success: true, message: 'Reset email sent' });
//   } catch (err) {
//     user.resetPasswordToken = undefined;
//     user.resetPasswordExpire = undefined;
//     await user.save({ validateBeforeSave: false });

//     res.status(500).json({ success: false, message: 'Email could not be sent' });
//   }
// };


// @route   POST /api/v1/auth/forgot-password
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  // 1. ابحث عن المستخدم
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  // 2. أنشئ كود عشوائي (6 أرقام مثلاً)
  const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits

  // 3. خزّن الكود وتاريخ انتهاء الصلاحية
  user.resetCode = crypto.createHash('sha256').update(code).digest('hex');
  user.resetCodeExpire = Date.now() + 10 * 60 * 1000; // 10 دقائق

  await user.save({ validateBeforeSave: false });

  // 4. أرسل الكود إلى الإيميل
  const message = `
    <h3>Hello ${user.firstName},</h3>
    <p>Your password reset code is:</p>
    <h2>${code}</h2>
    <p>This code will expire in 10 minutes.</p>
  `;

  await sendEmail(user.email, 'Password Reset Code', message);

  res.status(200).json({ success: true, message: 'Reset code sent to email' });
};


                                                                                                              





export const  verifyResetCode = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Please provide the code.' });
    }

    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');

    const user = await User.findOne({
      resetCode: hashedCode,
      resetCodeExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired code.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Code verified successfully',
      userId: user._id 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error verifying code' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    const user = await User.findOne({ email });
    if (!user || !user.resetCodeExpire || user.resetCodeExpire < Date.now()) {
      return res.status(400).json({ success: false, message: 'Reset code expired or not verified' });
    }

    user.password = newPassword;
    user.resetCode = undefined;
    user.resetCodeExpire = undefined;
    await user.save();

    res.status(200).json({ success: true, message: 'Password reset successfully' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error resetting password' });
  }
};


