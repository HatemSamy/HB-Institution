import { asynchandler, AppError } from "../middleware/erroeHandling.js";
import ClassSelectionModel from "../models/ClassSelection.js";
import Lesson from "../models/Lesson.js";
import Unit from "../models/Unit.js";
import moment from 'moment-timezone';

import {uploadResourceToCloudinary } from "../utils/helpers.js";
import path from 'path';


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


export const completeLesson = asynchandler(async (req, res, next) => {
  const { lessonId } = req.params;

  const lesson = await Lesson.findById(lessonId);
  if (!lesson) throw new AppError('Lesson not found', 404);

  lesson.completed = true;
  await lesson.save();
  const nextLesson = await Lesson.findOne({
    unitId: lesson.unitId,
    order: lesson.order + 1
  });

  if (nextLesson) {
    nextLesson.islocked = false;
    await nextLesson.save();
  }

  res.status(200).json({
    success: true,
    message: "Lesson completed successfully",
    data: {
      completedLesson: {
        id: lesson._id,
        title: lesson.title,
        completed: lesson.completed,
        order: lesson.order
      },
      nextLesson: nextLesson ? {
        id: nextLesson._id,
        title: nextLesson.title,
        islocked: nextLesson.islocked,
        order: nextLesson.order
      } : null
    }
  });
});

export const toggleLessonLock = asynchandler(async (req, res) => {

  const { lessonId } = req.params;

  const lesson = await Lesson.findById(lessonId).select('title completed islocked');
  if (!lesson) {
    throw new AppError('Lesson not found', 404);
  }

  lesson.islocked = !lesson.islocked;
  await lesson.save();

  res.status(200).json({
    message: `Lesson ${lesson.islocked ? 'locked' : 'unlocked'} successfully`,
    islocked: lesson.islocked,
    data: lesson
  });


});

// export const updateLesson = asynchandler(async (req, res, next) => {
//   const { lessonId } = req.params;


//   const lesson = await Lesson.findById(lessonId)
//     .populate({
//       path: 'unitId',
//       select: 'courseId',
//       populate: {
//         path: 'courseId',
//         select: 'CreatedBy'
//       }
//     });

//   if (!lesson) {
//     throw new AppError('Lesson not found', 404);
//   }

//   const updatableFields = [
//     'title',
//     'description',
//     'content',
//     'resources',
//     'islocked',
//     'completionCriteria',
//     'passingScore',
//     'quizId'
//   ];

//   updatableFields.forEach(field => {
//     if (req.body[field] !== undefined) {
//       lesson[field] = req.body[field];
//     }
//   });

//   const updatedLesson = await lesson.save();

//   res.json({
//     success: true,
//     data: updatedLesson
//   });
// });

// export const getNextLessonsCalendar = asynchandler(async (req, res) => {
//   const studentId = req.user._id;

//   // Get class selection
//   const classSelection = await ClassSelectionModel.findOne({ studentId, status: 'confirmed' }).populate('groupId');

//   if (!classSelection || !classSelection.groupId) {
//     return res.status(404).json({ message: 'No confirmed group found for this student' });
//   }

//   const schedule = classSelection.groupId.schedule;

//   const today = moment().tz('UTC'); 
//   const upcomingLessons = [];

//   // Loop through the next 7 days
//   for (let i = 0; i < 7; i++) {
//     const currentDay = today.clone().add(i, 'days');
//     const dayName = currentDay.format('dddd');

//     const daySchedule = schedule.find(s => s.dayOfWeek === dayName);
//     if (daySchedule) {
//       const lessonDate = currentDay.format('YYYY-MM-DD');
//       upcomingLessons.push({
//         day: dayName,
//         date: lessonDate,
//         startTime: daySchedule.startTime,
//         endTime: daySchedule.endTime,
//         timezone: daySchedule.timezone || 'UTC'
//       });
//     }
//   }

//   res.json({ upcomingLessons });
// });



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
















// export const createLesson = asynchandler(async (req, res, next) => {
//   const { unitId } = req.body;
//   console.log({'req.body':req.body});

//   const unit = await Unit.findById(unitId);
//   if (!unit) throw new AppError('Unit not found', 404);

//   const lastLesson = await Lesson.findOne({ unitId }).sort('-order').select('order').lean();
//   const nextOrder = lastLesson ? lastLesson.order + 1 : 1;

//   const lessonData = {
//     ...req.body,
//     order: nextOrder,
//     islocked: nextOrder !== 1,
//   };

//   if (req.file) {
//     const result = await cloudinary.uploader.upload(req.file.path, {
//       resource_type: "raw",
//       folder: "lesson-resources",
//       format: "pdf",
//       flags: "attachment" // This enables download functionality
//     });

  
//     lessonData.resources = {
//       url: result.secure_url,
//       public_id: result.public_id,
//       type: 'pdf',
//       filename: req.file.originalname
//     };
//   }

//   const lesson = await Lesson.create(lessonData);

//   res.status(201).json({
//     success: true,
//     message: "Lesson created successfully",
//     data: {
//       id: lesson._id,
//       title: lesson.title,
//       description: lesson.description,
//       order: lesson.order,
//       resources: lesson.resources ? {
//         ...lesson.resources,
//         preview_url: cloudinary.url(lesson.resources.public_id, {
//           resource_type: "image",
//           format: "jpg",
//           page: 1,
//           width: 300,
//           height: 400,
//           crop: "fit"
//         }),
//         download_url: cloudinary.url(lesson.resources.public_id, {
//           resource_type: "raw",
//           flags: `attachment:${lesson.resources.filename}`
//         }),
//         inline_url: lesson.resources.url,
//       } : null,
//       islocked: lesson.islocked,
//       completionCriteria: lesson.completionCriteria,
//       createdAt: lesson.createdAt,
//     },
//   });
// });
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// export const createLesson = asynchandler(async (req, res, next) => {
//   const { unitId } = req.body;
//   console.log(req.body);

//   const unit = await Unit.findById(unitId);
//   if (!unit) throw new AppError('Unit not found', 404);

//   const lastLesson = await Lesson.findOne({ unitId }).sort('-order').select('order').lean();
//   const nextOrder = lastLesson ? lastLesson.order + 1 : 1;

//   const lessonData = {
//     ...req.body,
//     order: nextOrder,
//     islocked: nextOrder !== 1,
//   };

//   if (req.file) {
//   const result = await cloudinary.uploader.upload(req.file.path, {
//     resource_type: "raw",
//     folder: "lesson-resources",
//     format: "pdf"
//   });

//   const downloadUrl = cloudinary.url(result.public_id, {
//     resource_type: "raw",
//     flags: `attachment:${req.file.originalname}`
//   });

//   const inlineUrl = cloudinary.url(result.public_id, {
//     resource_type: "raw",
//     flags: "inline"
//   });

//   const previewUrl = cloudinary.url(result.public_id, {
//     resource_type: "image",
//     format: "jpg",
//     page: 1,
//     width: 300,
//     height: 400,
//     crop: "fit"
//   });

//   lessonData.resources = {
//     url: result.secure_url,
//     public_id: result.public_id,
//     type: 'pdf',
//     filename: req.file.originalname,
//     preview_url: previewUrl,
//     download_url: downloadUrl,
//     inline_url: inlineUrl
//   };
// }


//   const lesson = await Lesson.create(lessonData);

//   res.status(201).json({
//     success: true,
//     message: "Lesson created successfully",
//     data: {
//       id: lesson._id,
//       title: lesson.title,
//       description: lesson.description,
//       order: lesson.order,
//       resources: lesson.resources ? {
//         ...lesson.resources,
//         download_url:`${lesson.resources.url}?fl_attachment=${encodeURIComponent(lesson.resources.filename)}`,

//         inline_url: lesson.resources.url,
//       } : null,
//       islocked: lesson.islocked,
//       completionCriteria: lesson.completionCriteria,
//       createdAt: lesson.createdAt,
//     },
//   });
// });

// lessonRoutes.js


// export const createLesson = asynchandler(async (req, res, next) => {
//   const { unitId } = req.body;

//   const unit = await Unit.findById(unitId);
//   if (!unit) throw new AppError('Unit not found', 404);

//   const lastLesson = await Lesson.findOne({ unitId }).sort('-order').select('order').lean();
//   const nextOrder = lastLesson ? lastLesson.order + 1 : 1;

//   const lessonData = {
//     ...req.body,
//     order: nextOrder,
//     islocked: nextOrder !== 1,
//   };

//   if (req.file) {
//     try {
//       const { secure_url, public_id } = await cloudinary.uploader.upload(req.file.path, {
//         folder: 'lesson-resources',
//         resource_type: 'raw',
//       });

//       const fileType = getFileType(req.file.mimetype);
//       const filename = req.file.originalname;
//       const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

//       lessonData.resources = {
//         url: secure_url,
//         public_id,
//         type: fileType,
//         filename,
//         preview_url: `https://res.cloudinary.com/${cloudName}/image/upload/c_fit,h_400,pg_1,w_300/v1/${public_id}.jpg`,
//         download_url: `https://res.cloudinary.com/${cloudName}/raw/upload/fl_attachment:${encodeURIComponent(filename)}/v1/${public_id}`,
//         inline_url: `https://res.cloudinary.com/${cloudName}/raw/upload/v1/${public_id}`
//       };
//     } catch (uploadError) {
//       console.error('Cloudinary upload error:', uploadError);
//       throw new AppError('Failed to upload resource file', 500);
//     }
//   }

//   const lesson = await Lesson.create(lessonData);

//   res.status(201).json({
//     success: true,
//     message: 'Lesson created successfully',
//     data: {
//       id: lesson._id,
//       title: lesson.title,
//       description: lesson.description,
//       order: lesson.order,
//       resources: lesson.resources,
//       islocked: lesson.islocked,
//       completionCriteria: lesson.completionCriteria,
//       createdAt: lesson.createdAt,
//     },
//   });
// });


// lessonRoutes.js