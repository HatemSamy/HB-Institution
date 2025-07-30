import { AppError, asynchandler } from "../middleware/erroeHandling.js";
import User from "../models/User.js";
import  Group  from '../models/Group.js';
import mongoose from 'mongoose';
import ClassSelectionModel from "../models/ClassSelection.js";
import cloudinary from "../utils/cloudinary.js";


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
  const instructors = await User.find({ role: 'instructor' }).select('-password');

  const formatted = instructors.map(instructor => ({
    _id: instructor._id,
    firstName: instructor.firstName,
    lastName: instructor.lastName,
    specialization: instructor.specialization,
    availableTime: instructor.availableTime
  }));

  res.status(200).json({
    success: true,
    results: formatted.length,
    data: formatted
  });
});



export const getInstructorDashboard = asynchandler(async (req, res, next) => {
  const instructorId = req.user._id; 
console.log('Instructor ID:', req.user._id);

const dashboardData = await Group.aggregate([
  {
    $match: {
      instructorId: new mongoose.Types.ObjectId(instructorId)
    }
  },
  {
    $lookup: {
      from: 'courses',
      localField: 'courseId',
      foreignField: '_id',
      as: 'course'
    }
  },
  {
    $unwind: '$course'
  },
  {
    $project: {
      _id: 1,
      code: 1,
      level: 1,
      maxStudents: 1,
      currentStudents: 1,
      schedule: 1,
      course: {
        _id: 1,
        title: 1,
        price: 1,
        duration: 1,
        image: 1
      }
    }
  }
]);

res.status(200).json({
  success: true,
  message: "Instructor dashboard data",
  data: dashboardData
});

});





export const getStudentDashboardData = asynchandler(async (req, res, next) => {
  const studentId = req.user._id;

  const data = await ClassSelectionModel.aggregate([
    {
      $match: {
        studentId: new mongoose.Types.ObjectId(studentId),
        status: 'confirmed'
      }
    },

    {
      $lookup: {
        from: 'courses',
        localField: 'courseId',
        foreignField: '_id',
        as: 'course'
      }
    },
    { $unwind: '$course' },

    {
      $lookup: {
        from: 'groups',
        localField: 'groupId',
        foreignField: '_id',
        as: 'group'
      }
    },
    { $unwind: '$group' },

    {
      $project: {
        _id: 0,
        courseId: '$course._id',
        courseTitle: '$course.title',
        courseImage: '$course.image',
        duration: '$course.duration',
        price: '$course.price',
        group: {
          _id: '$group._id',
          name: '$group.code',
          level: '$group.level',

          schedule: '$group.schedule',
        }
      }
    }
  ]);

  if (!data.length) {
    return next(new AppError('No enrolled courses found for this student.', 404));
  }

  res.status(200).json({
    success: true,
    message: 'Dashboard data fetched successfully',
    data
  });
});


export const updateProfile = asynchandler(async (req, res, next) => {
  const userId = req.user._id;
  const user = await User.findById(userId);
  if (!user) return next(new AppError('User not found', 404));

  if (req.file) {
    const file = req.file;
    const { secure_url} = await cloudinary.uploader.upload(file.path, {
      folder: `HB-Institution/Users/${userId}`,
    });
    req.body.avatar = secure_url;
  }
  const updatedFields = {};
  for (let key of ['firstName', 'lastName', 'phoneNumber', 'avatar']) {
    if (req.body[key]) updatedFields[key] = req.body[key];
  }

const updatedUser = await User.findByIdAndUpdate(userId, updatedFields, {
    new: true,
    select: 'firstName lastName phoneNumber avatar' 
  });

  res.status(200).json({ message: 'Profile updated', user: updatedUser });
});




export const getProfile = asynchandler(async (req, res, next) => {
  const userId = req.user._id;

  const user = await User.findById(userId).select(
    'firstName lastName email phoneNumber avatar role  specialization'
  );

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    message: 'User profile fetched successfully',
    user,
  });
});


export const  setInstructorAvailability = asynchandler(async (req, res, next) => {
  const {availableTime } = req.body;
  const instructorId =req.params.instructorId
  if (!instructorId || !availableTime) {
    return next(new AppError('InstructorId and availableTime are required', 400));
  }
  const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  for (const [day, timeSlot] of Object.entries(availableTime)) {
    if (!validDays.includes(day.toLowerCase())) {
      return next(new AppError(`Invalid day: ${day}. Valid days are: ${validDays.join(', ')}`, 400));
    }

    if (typeof timeSlot.from !== 'number' || typeof timeSlot.to !== 'number' || 
        timeSlot.from < 0 || timeSlot.from > 23 || timeSlot.to < 0 || timeSlot.to > 23) {
      return next(new AppError(`Invalid time format for ${day}. Hours must be numbers between 0-23`, 400));
    }

    if (timeSlot.from >= timeSlot.to) {
      return next(new AppError(`Invalid time range for ${day}. 'from' time must be before 'to' time`, 400));
    }
  }
  const instructor = await User.findById(instructorId);
  if (!instructor) {
    return next(new AppError('Instructor not found', 404));
  }
  if (!instructor.availableTime) {
    instructor.availableTime = new Map();
  }
 
  for (const [day, timeSlot] of Object.entries(availableTime)) {
    instructor.availableTime.set(day.toLowerCase(), timeSlot);
  }
  
  await instructor.save();

  // Convert Map back to object for response
  const responseData = {
    _id: instructor._id,
    firstName: instructor.firstName,
    lastName: instructor.lastName,
    email: instructor.email,
    role: instructor.role,
    availableTime: Object.fromEntries(instructor.availableTime),
  };

  res.status(200).json({
    success: true,
    message: 'Instructor available time updated successfully',
    data: responseData
  });
});


export const getAllUsers = asynchandler(async (req, res, next) => {
  const users = await User.find({}, '_id firstName lastName email role specialization');
  res.status(200).json({
    success: true,
    count: users.length,
    users
  });
});