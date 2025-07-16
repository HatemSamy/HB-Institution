import { AppError, asynchandler } from "../middleware/erroeHandling.js";
import User from "../models/User.js";





export const blockUser = asynchandler(async (req, res, next) => {
  const { userId } = req.params;

  const user = await User.findById(userId);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  user.isBlocked = !user.isBlocked ;
  await user.save();

  res.status(200).json({
    success: true,
    message: `User ${user.firstName} ${user.lastName} has been ${user.isBlocked? 'Block' : 'unBlock'}.`,
    data: {
      id: user._id,
      isBlocked: user.isBlocked
    }
  });
});


// getInstructors
export const getInstructors = asynchandler(async (req, res) => {
  const instructors = await User.find({ role: 'instructor'}).select('-password');

  res.status(200).json({
    success: true,
    results: instructors.length,
    data: instructors
  });
});


