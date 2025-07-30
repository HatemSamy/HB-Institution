import { asynchandler, AppError } from "../middleware/erroeHandling.js";
import ClassSelectionModel from "../models/ClassSelection.js";
import Lesson from "../models/Lesson.js";
import Unit from "../models/Unit.js";
import moment from 'moment-timezone';
import {uploadResourceToCloudinary } from "../utils/helpers.js";
import mongoose from "mongoose";



const verifyUnitAccess = async (unitId, courseId) => {
  const unit = await Unit.findOne({ _id: unitId });

  if (!unit) throw new AppError('Unit not found in your course');
  return unit;
};


export const getUnitWithLessons = asynchandler(async (req, res, next) => {
  const { unitId } = req.params;

  const unit = await Unit.findById(unitId)
    .populate('courseId', 'title');

  if (!unit) {
    throw new AppError('Unit not found', 404);
  }

  const lessons = await Lesson.find({ unitId })
    .sort('order')
    .select('-__v');

  const response = {
    unit: {
      _id: unit._id,
      title: unit.title,
      description: unit.description,
      order: unit.order,
      course: {
        _id: unit.courseId._id,
        title: unit.courseId.title
      }
    },
    lessons: lessons.map(lesson => ({
      _id: lesson._id,
      title: lesson.title,
      description: lesson.description,
      order: lesson.order,
      islocked: lesson.islocked,
      completed: lesson.completed,
      createdAt: lesson.createdAt
    }))
  };

  res.json(response);
});

export const getLessonDetails = asynchandler(async (req, res, next) => {
  const { lessonId } = req.params;

  const lesson = await Lesson.findById(lessonId)
    .populate({
      path: 'unitId',
      select: 'title order courseId',
      populate: {
        path: 'courseId',
        select: 'title _id'
      }
    })
    .select('-__v');

  if (!lesson) {
    throw new AppError('Lesson not found', 404);
  }

  res.status(201).json({ message: 'Lesson Details ', lesson });

});


export const deleteLesson = asynchandler(async (req, res, next) => {
  const { lessonId } = req.params;

  const lesson = await Lesson.findById(lessonId).populate({
    path: 'unitId',
    select: 'courseId'
  });

  if (!lesson) {
    throw new AppError('Lesson not found', 404);
  }
  const deletedLessonData = {
    id: lesson._id,
    title: lesson.title,
    order: lesson.order,
    unitId: lesson.unitId._id,
    courseId: lesson.unitId.courseId
  };

  await Lesson.deleteOne({ _id: lessonId });

  const updateResult = await Lesson.updateMany(
    {
      unitId: lesson.unitId._id,
      order: { $gt: lesson.order }
    },
    { $inc: { order: -1 } }
  );

  res.status(200).json({
    success: true,
    message: 'Lesson deleted successfully',
    deletedLesson: deletedLessonData,
    affectedLessonsCount: updateResult.modifiedCount
  });
});



export const getCalendarForStudent = asynchandler(async (req, res) => {
  const studentId = req.user._id;

  const classSelection = await ClassSelectionModel.findOne({ studentId, status: 'confirmed' }).populate('groupId');
  if (!classSelection || !classSelection.groupId) {
    return res.status(404).json({ message: 'No confirmed group found for this student' });
  }

  const schedule = classSelection.groupId.schedule;
  const timezone = schedule[0]?.timezone || 'UTC';

  const today = moment().tz(timezone);
  const calendarEvents = [];

  for (let i = 0; i < 30; i++) {
    const currentDay = today.clone().add(i, 'days');
    const currentDayName = currentDay.format('dddd');

    const matchedSchedule = schedule.find(s => s.dayOfWeek === currentDayName);
    if (matchedSchedule) {
      const start = moment.tz(`${currentDay.format('YYYY-MM-DD')}T${matchedSchedule.startTime}`, timezone);
      const end = moment.tz(`${currentDay.format('YYYY-MM-DD')}T${matchedSchedule.endTime}`, timezone);

      calendarEvents.push({
        title: 'Live Class',
        date: currentDay.format('YYYY-MM-DD'),
        startTime: matchedSchedule.startTime,
        endTime: matchedSchedule.endTime,
        start: start.toISOString(),
        end: end.toISOString(),
        timezone
      });
    }
  }

  res.status(200).json({ 'calendarEvents': calendarEvents });
});


export const getStudentWeeklySchedule = asynchandler(async (req, res) => {

  const studentId = req.user._id;
  const selections = await ClassSelectionModel.find({ studentId, status: 'confirmed' })
    .populate('courseId', 'title')
    .populate('instructorId', 'fullName');

  const calendarEvents = [];

  const startOfWeek = moment().startOf('week');

  for (const selection of selections) {
    for (const slot of selection.selectedSchedule) {
      const { dayOfWeek, startTime, endTime, timezone } = slot;

      const dayIndex = moment().day(dayOfWeek).day();
      const lessonDate = startOfWeek.clone().day(dayIndex);

      const scheduleItem = {
        course: selection.courseId.title,
        instructor: selection.instructorId.fullName,
        day: dayOfWeek,
        date: lessonDate.format('YYYY-MM-DD'),
        time: `${startTime} - ${endTime}`,
        timezone: timezone || 'Africa/Cairo',
      };

      calendarEvents.push(scheduleItem);
    }
  }

  res.json({ 'calendarEvents': calendarEvents });

});









export const createLesson = asynchandler(async (req, res) => {
  const { unitId } = req.body;

  const unit = await Unit.findById(unitId);
  if (!unit) throw new AppError('Unit not found', 404);

  const lastLesson = await Lesson.findOne({ unitId }).sort('-order').select('order').lean();
  const nextOrder = lastLesson ? lastLesson.order + 1 : 1;
  let resourceData = null;
  if (req.file) {
    resourceData = await uploadResourceToCloudinary(req.file);
  }
  const lessonData = {
    ...req.body,
    order: nextOrder,
    // islocked: nextOrder !== 1,
    resources: resourceData, 
  };

  const lesson = await Lesson.create(lessonData);

  res.status(201).json({
    success: true,
    message: 'Lesson created successfully',
    data: {
      id: lesson._id,
      title: lesson.title,
      description: lesson.description,
      order: lesson.order,
      islocked: lesson.islocked,
      completionCriteria: lesson.completionCriteria,
      createdAt: lesson.createdAt,
      resources: resourceData,
    },
  });
});






export const updateLesson = asynchandler(async (req, res) => {
  const { lessonId } = req.params;
  const updates = { ...req.body };
  
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) throw new AppError('Lesson not found', 404);

 
  if (req.file) {
    const newResource = await uploadResourceToCloudinary(req.file);
    updates.resources = newResource;
  }

  Object.assign(lesson, updates);
  await lesson.save();

  res.status(200).json({
    success: true,
    message: 'Lesson updated successfully',
    data: {
      id: lesson._id,
      title: lesson.title,
      description: lesson.description,
      order: lesson.order,
      islocked: lesson.islocked,
      completionCriteria: lesson.completionCriteria,
      createdAt: lesson.createdAt,
      resources: lesson.resources,
    },
  });
});





// PATCH /lessons/:lessonId/complete/:groupId
export const completeLessonByInstructor = asynchandler(async (req, res, next) => {
  const { lessonId, groupId } = req.params;

  const lesson = await Lesson.findById(lessonId);
  if (!lesson) throw new AppError('Lesson not found', 404);

  lesson.completed = true;
  await lesson.save();

  const nextLesson = await Lesson.findOne({
    unitId: lesson.unitId,
    order: lesson.order + 1
  });

  let unlocked = false;

  if (nextLesson && !nextLesson.unlockedForGroups.includes(groupId)) {
    nextLesson.unlockedForGroups.push(groupId);
    await nextLesson.save();
    unlocked = true;
  }

  res.status(200).json({
    success: true,
    message: 'Lesson marked as completed and next unlocked (if exists)',
    data: {
      completedLessonId: lesson._id,
      nextLessonUnlocked: unlocked ? {
        id: nextLesson._id,
        title: nextLesson.title
      } : null
    }
  });
});




export const getLessonsStatus = asynchandler(async (req, res, next) => {
  const { groupId, unitId } = req.params;

  const lessons = await Lesson.find({ unitId }) 
    .populate('unitId', 'title')
    .sort({ order: 1 });

  const formatted = lessons.map(lesson => ({
    id: lesson._id,
    title: lesson.title,
    order:lesson.order,
    unit: lesson.unitId?.title,
    completed: lesson.completedByInstructors,
    unlocked: lesson.unlockedForGroups.some(id => id.equals(groupId))
  }));

  res.status(200).json({
    success: true,
    count: formatted.length,
    lessons: formatted
  });
});







export const toggleLessonAccess = asynchandler(async (req, res) => {
  const { lessonId, groupId } = req.params;

  const lesson = await Lesson.findById(lessonId);
  if (!lesson) throw new AppError('Lesson not found', 404);


  const isUnlocked = lesson.unlockedForGroups.some(id => id.equals(groupId));

  if (isUnlocked) {
    lesson.unlockedForGroups = lesson.unlockedForGroups.filter(id => !id.equals(groupId));
  } else {
    lesson.unlockedForGroups.push(groupId);
  }

  await lesson.save();

  res.status(200).json({
    success: true,
    message: `Lesson is now ${isUnlocked ? 'locked' : 'unlocked'} for this group`,
    data: {
      lessonId: lesson._id,
      groupId,
      unlocked: !isUnlocked
    }
  });
});


