
import { AppError, asynchandler } from "../middleware/erroeHandling.js";
import Chapter from '../models/Unit.js';
import Course from "../models/Course.js";
import mongoose from "mongoose";
import User from "../models/User.js";
import Group from "../models/Group.js";
import CategoryModel from "../models/category.js";
import Unit from "../models/Unit.js";
import ClassSelectionModel from "../models/ClassSelection.js";
import { sendEmail } from "../utils/email.js";
import cloudinary from "../utils/cloudinary.js";

export const createCourse = (async (req, res, next) => {
  try {
    const { title, duration, price, description, levels } = req.body;
    const{CategoryId} =req.params

    if (!title || !duration || !price || !description || !levels) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    const category= await CategoryModel.findById(CategoryId)
    if (!category) {
    return next(new AppError('category not found', 404));
      
    }

    const allowedLevels = ['Beginner', 'Intermediate', 'Advanced'];
    const levelsArray = Array.isArray(levels) ? levels : [levels];
    const isValidLevels = levelsArray.every(level => allowedLevels.includes(level));

    if (!isValidLevels) {
      return res.status(400).json({ message: 'Invalid level provided.' });
    }

     const file = req.file;
    const { secure_url} = await cloudinary.uploader.upload(file.path, {
    folder: `HB-Institution/Course/${title}`
  });

    const newCourse = new Course({
      title,
      duration,
      price,
      description,
      CategoryId,
      levels: levelsArray,
      CreatedBy: req.user._id,
      image: secure_url || undefined
    });

    const savedCourse = await newCourse.save();

    res.status(201).json({
      message: 'Course created successfully.',
      course: savedCourse
    });
  } catch (error) {
    next(error);
  }
});



export const getCourseById = asynchandler(async (req, res, next) => {
  const { id } = req.params;
  const course = await Course.findOne({ _id: id, isActive: true })
    .populate('CreatedBy', 'firstName lastName email')
    .populate('CategoryId', 'name description');

  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  const units = await Unit.find({ courseId: id }).sort({ createdAt: 1 }).select('title description');

  res.status(200).json({
    success: true,
    data: {
      ...course.toObject(),
      units
    }
  });
});


// 1. GET ALL COURSES
export const getAllCourses = asynchandler(async (req, res) => {

  const courses = await Course.find().select('name description levels')
  .populate('CategoryId', 'name description');

  if (!courses) {
    return next(new AppError('Courses not found', 404));
  }

  res.status(200).json({
    success: true,
    data: courses
  });
}
);




// 2. GET LEVELS BY COURSE
export const GetLevelByCourse = asynchandler(async (req, res) => {
  const { courseId } = req.params;

  const course = await Course.findById(courseId);
  if (!course) {
    return next(new AppError('Courses not found', 404));
  }

  res.json({
    success: true,
    data: {
      courseId: course._id,
      courseName: course.name,
      levels: course.levels
    }
  });

});



// 4. GET GROUPS BY COURSE, LEVEL, AND TEACHER
export const getGroupByCourse = asynchandler(async (req, res) => {

  const { courseId, level, teacherId } = req.params;
  const groups = await Group.find({
    courseId,
    level,
    teacherId,
    isActive: true
  }).populate('courseId', 'name')
    .populate('teacherId', 'name')
    .select('name maxStudents currentStudents schedule');

  // Add availability status
  const groupsWithAvailability = groups.map(group => ({
    ...group.toObject(),
    isAvailable: group.currentStudents < group.maxStudents,
    spotsLeft: group.maxStudents - group.currentStudents
  }));

  res.json({
    success: true,
    data: groupsWithAvailability
  });

});


// 4. GET GROUPS BY COURSE, LEVEL, AND INSTRUCTOR
export const getGroupsByCourseAndInstructor = asynchandler( async (req, res) => {
  try {
    const { courseId, level, instructorId } = req.params;

    const groups = await Group.find({
      courseId,
      level,
      instructorId, // Changed from teacherId
      isActive: true
    }).populate('courseId', 'name')
      .populate('instructorId', 'firstName lastName email') // Updated populate
      .select('name maxStudents currentStudents schedule');

    // Add availability status and format instructor name
    const groupsWithAvailability = groups.map(group => ({
      ...group.toObject(),
      instructor: {
        _id: group.instructorId._id,
        name: `${group.instructorId.firstName} ${group.instructorId.lastName}`,
        email: group.instructorId.email
      },
      isAvailable: group.currentStudents < group.maxStudents,
      spotsLeft: group.maxStudents - group.currentStudents
    }));

    res.json({
      success: true,
      data: groupsWithAvailability
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching groups',
      error: error.message
    });
  }
});



// 5. GET TIME SLOTS FOR A GROUP
export const getTimeSlotsForGroup  = asynchandler(async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId)
      .populate('courseId', 'name')
      .populate('instructorId', 'firstName lastName email'); // Updated populate

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    res.json({
      success: true,
      data: {
        groupId: group._id,
        groupName: group.name,
        course: group.courseId.name,
        instructor: {
          _id: group.instructorId._id,
          name: `${group.instructorId.firstName} ${group.instructorId.lastName}`,
          email: group.instructorId.email
        },
        level: group.level,
        schedule: group.schedule,
        isAvailable: group.currentStudents < group.maxStudents
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching time slots',
      error: error.message
    });
  }
});



export const ClassSelection = asynchandler(async (req, res) => {
  try {
    const {
      courseId,
      level,
      instructorId,
      groupId,
      selectedSchedule
    } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    if (group.currentStudents >= group.maxStudents) {
      return res.status(400).json({
        success: false,
        message: 'Group is full'
      });
    }

    const existingSelection = await ClassSelectionModel.findOne({
     studentId:req.user._id,
      courseId,
      status: { $in: ['pending', 'confirmed'] }
    });

    if (existingSelection) {
      return res.status(400).json({
        success: false,
        message: 'Student already has a selection for this course'
      });
    }

    const classSelection = new ClassSelectionModel({
      studentId:req.user._id,
      courseId,
      level,
      instructorId,
      groupId,
      selectedSchedule,
      status: 'pending'
    });

    await classSelection.save();

    const populatedSelection = await ClassSelectionModel.findById(classSelection._id)
      .populate('studentId', 'firstName lastName email')
      .populate('courseId', 'name')
      .populate('instructorId', 'firstName lastName email')
      .populate('groupId');

    const student = populatedSelection.studentId;
    const course = populatedSelection.courseId;
    const instructor = populatedSelection.instructorId;
    const groupData = populatedSelection.groupId;

    const htmlMessage = `
      <h2>Class Selection Confirmation</h2>
      <p>Dear ${student.firstName},</p>
      <p>You have successfully selected a class for:</p>
      <ul>
        <li><strong>Course:</strong> ${course.title}</li>
        <li><strong>Instructor:</strong> ${instructor.firstName} ${instructor.lastName}</li>
        <li><strong>Level:</strong> ${level}</li>
        <li><strong>Group Code:</strong> ${groupData.code}</li>
        <li><strong>Schedule:</strong>
          <ul>
            ${groupData.schedule.map(s =>
              `<li>${s.dayOfWeek}: ${s.startTime} - ${s.endTime} (${s.timezone})</li>`
            ).join('')}
          </ul>
        </li>
      </ul>
      <p>Status: <strong>${populatedSelection.status}</strong></p>
      <p>Thank you for your selection.</p>
    `;

    await sendEmail(student.email, 'Class Selection Confirmation', htmlMessage);

    res.status(201).json({
      success: true,
      message: 'Class selection created and email sent successfully',
      data: populatedSelection
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating class selection',
      error: error.message
    });
  }
});



export const approveCourse = asynchandler(async (req, res, next) => {
  const course = await Course.findByIdAndUpdate(
    req.params.id,
    { approved: true },
    { new: true, runValidators: true }
  ).populate('instructorId', 'name email');

  if (!course) {
    return next(new Error('course_not_found'));
  }

  res.status(200).json({
    success: true,
    message: 'course_approved_successfully',
    data: course
  });
});






export const updateCourse = asynchandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);
  if (!course) {
    return next(new Error('course_not_found'));
  }

  // Check authorization
  if (
    course.CreatedBy.toString() !== req.user.id &&
    course.instructorId.toString() !== req.user.id
  ) {
    return next(new Error('not_authorized'));
  }

  // If image is uploaded, update it
  if (req.file) {
    req.body.course_imageId = req.file.filename;
    req.body.course_imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  }

  const updatedCourse = await CourseModel.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  })
    .populate('instructorId', 'name email')
    .populate('CreatedBy', 'name email');

  res.status(200).json({
    success: true,
    message: 'course_updated',
    data: updatedCourse
  });
});




export const rateCourse = asynchandler(async (req, res, next) => {

  const { courseId, rating } = req.params;
  const studentId = req.user.id;

  const course = await Course.findById(courseId);
  if (!course) return next(new Error('course_not_found'));

  if (!course.approved) {
    return res.status(400).json({
      success: false,
      message: 'Course is not approved for rating'
    });
  }

  // ✅ Check if student is enrolled
  const isEnrolled = course.students_enrolled.includes(studentId);
  if (!isEnrolled) {
    return res.status(403).json({
      success: false,
      message: 'You must be enrolled in the course to rate it'
    });
  }

  // ✅ Set the rating
  course.rating = Number(rating);
  await course.save();

  res.status(200).json({
    success: true,
    message: 'Rating submitted successfully',
    data: { rating: course.rating }
  });
});




export const getInstructorsByCourseAndLevel = asynchandler(async (req, res) => {
  const { courseId, level } = req.body;

  // Step 1: Find groups matching courseId and level, and populate instructor info
  const groups = await Group.find({ courseId, level })
    .populate({
      path: 'instructorId',
      match: {
        role: 'instructor',
        isActive: true,
        isBlocked: false
      },
      select: 'firstName lastName email specialization avatar'
    });

  // Step 2: Extract instructor data and filter out nulls
  const instructors = groups
    .map(group => group.instructorId)
    .filter(ins => ins); // remove nulls (in case of unmatched instructors)

  // Step 3: Format instructor info
  const formattedInstructors = instructors.map(ins => ({
    _id: ins._id,
    name: `${ins.firstName} ${ins.lastName}`,
    firstName: ins.firstName,
    lastName: ins.lastName,
    email: ins.email,
    specialization: ins.specialization,
    avatar: ins.avatar
  }));

  // Step 4: Format groups info (optional: filter null instructor)
  const formattedGroups = groups
    .filter(g => g.instructorId) // keep only groups with valid instructor
    .map(g => ({
      _id: g._id,
      code: g.code,
      courseId: g.courseId,
      level: g.level,
      schedule: g.schedule,
      instructorId: g.instructorId._id,
      instructorName: `${g.instructorId.firstName} ${g.instructorId.lastName}`
    }));

  res.json({
    success: true,
    data: {
      instructors: formattedInstructors,
      groups: formattedGroups
    }
  });
});

