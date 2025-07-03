import User from "../models/User.js";
import { sendEmail } from "../utils/email.js";
import crypto from 'crypto';
import sendTokenResponse from "../utils/generateToken.js";
import { AppError, asynchandler } from "../middleware/erroeHandling.js";
import { log } from "console";

export const registerUser = asynchandler(async (req, res, next) => {


  if (req.body.role === 'admin') {
    return next(new AppError('You are not allowed to register as admin', 403));
  }
 const {email}=req.body
 
  const existing = await User.findOne({ email});

  if (existing) {
    return next(new AppError('User already exists with this email', 400));
  }

  const user = await User.create(req.body);

  sendTokenResponse(user, 201, res); 
});


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



// @route   POST /api/v1/auth/forgot-password
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits

  user.resetCode = crypto.createHash('sha256').update(code).digest('hex');
  user.resetCodeExpire = Date.now() + 10 * 60 * 1000; // 10 دقائق

  await user.save({ validateBeforeSave: false });


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
    }).select('email');

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired code.' });
    }

    return res.status(200).json({success: true,
  message: 'Code verified successfully',
      userData:user
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


