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
  const instructors = await User.find({ role: 'instructor'}).select('-password');

  res.status(200).json({
    success: true,
    results: instructors.length,
    data: instructors
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
  const studentId  = req.user._id;
    console.log(studentId);

  const data = await ClassSelectionModel.aggregate([
    { $match: { studentId: new mongoose.Types.ObjectId(studentId), status: 'confirmed' } },

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
        from: 'units',
        localField: 'courseId',
        foreignField: 'courseId',
        as: 'units'
      }
    },

    {
      $unwind: {
        path: '$units',
        preserveNullAndEmptyArrays: true
      }
    },

    {
      $lookup: {
        from: 'lessons',
        localField: 'units._id',
        foreignField: 'unitId',
        as: 'units.lessons'
      }
    },

    {
      $group: {
        _id: '$course._id',
        courseTitle: { $first: '$course.title' },
        courseImage: { $first: '$course.image' },
        duration: { $first: '$course.duration' },
        price: { $first: '$course.price' },
        units: {
          $push: {
            _id: '$units._id',
            title: '$units.title',
            description: '$units.description',
            lock: '$units.lock',
            completed: '$units.Completed',
            lessons: '$units.lessons'
          }
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



export const setInstructorAvailability = asynchandler(async (req, res, next) => {
  const { userId, day } = req.params;
  const { from, to } = req.body;

  const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  if (!validDays.includes(day.toLowerCase())) {
    return next(new AppError('Invalid day provided', 400));
  }

  if (from == null || to == null || from < 0 || to > 23 || from >= to) {
    return next(new AppError('Invalid time range', 400));
  }

  const user = await User.findById(userId);
  if (!user) return next(new AppError('User not found', 404));
  if (user.role !== 'instructor') return next(new AppError('Only instructors can have availability times', 400));

  user.availableTime.set(day.toLowerCase(), { from, to });
  await user.save();

  res.status(200).json({ 
    message: `Availability for ${day} updated`, 
    availableTime: user.availableTime 
  });
});

