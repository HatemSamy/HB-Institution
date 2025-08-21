import User from "../models/User.js";
import { sendEmail } from "../utils/email.js";
import sendTokenResponse from "../utils/generateToken.js";
import { AppError, asynchandler } from "../middleware/erroeHandling.js";
import { generateConfirmationEmailTemplate } from "../templates/confirmationEmailTemplate.js";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

export const registerUser = asynchandler(async (req, res, next) => {
  const { firstName, lastName, email, password, role } = req.body

  if (role === 'admin') {
    return next(new AppError('You are not allowed to register as admin', 403));
  }
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('User already exists with this email', 400));
  }

  const hashedPassword = bcrypt.hashSync(password, parseInt(process.env.SALTROUND));

  const userData = { firstName, lastName, email, password: hashedPassword, role };
  if (role === 'instructor') {
    userData.specialization = req.body.specialization;
  }
  const newUser = new User(userData);

  const token = jwt.sign(
    { id: newUser._id },
    process.env.JWT_SECRET,
  );

  const confirmLink = `${req.protocol}://${req.headers.host}${process.env.BASEURL}/auth/confirmEmail/${token}`

  // Generate beautiful HTML email template
  const userName = `${firstName} ${lastName}`;
  const emailTemplate = generateConfirmationEmailTemplate(userName, confirmLink);

  const info = await sendEmail(
    req.body.email,
    '🎓 Welcome to HB Institution - Confirm Your Email',
    emailTemplate
  );

  if (info?.accepted?.length) {
    const savedUser = await newUser.save();
    res.status(201).json({
      message: 'Registration successful. Please confirm your email.',
      userId: savedUser._id
    });
  } else {
    return next(new AppError('Email was rejected by the server', 500));
  }
});



export const confirmEmail = asynchandler(async (req, res, next) => {
  const { token } = req.params;

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return next(new AppError('Invalid or expired token', 400));
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  if (user.confirmed) {
    return res.redirect(`${process.env.FRONTEND_URL}/login?message=alreadyConfirmed`);
  }

  user.confirmed = true;
  await user.save();

  res.redirect(`${process.env.FRONTEND_URL}/login?message=confirmed`);
});



export const loginUser = async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
 
  if (!user) {
    return res.status(401).json({ success: false, message: 'User not found' });
  }
  const isMatch = bcrypt.compareSync(password, user.password);

  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  if (!user.confirmed) {
    return res.status(403).json({
      success: false,
      message: 'Please confirm your email before logging in.',
    });
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


export const verifyResetCode = async (req, res) => {
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

    return res.status(200).json({
      success: true,
      message: 'Code verified successfully',
      userData: user
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



export const updatePassword = asynchandler(async (req, res, next) => {
  const userId = req.user._id; 
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(userId).select('+password firstName email role');
  
  if (!user){ 
    return next(new AppError('User not found', 404));
}
  const isMatch = bcrypt.compareSync(currentPassword, user.password);
  if (!isMatch) {
    return next(new AppError('Incorrect current password', 400));
  }
  const hashedPassword = bcrypt.hashSync(newPassword, parseInt(process.env.SALTROUND));

  user.password = hashedPassword;
  await user.save();

  res.status(200).json({ message: 'Password updated successfully' });
});
