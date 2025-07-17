import { asynchandler ,AppError} from "../middleware/erroeHandling.js";
import Lesson from "../models/Lesson.js";
import Unit from "../models/Unit.js";





const verifyUnitAccess = async (unitId, courseId) => {
  const unit = await Unit.findOne({ _id: unitId });
  
  if (!unit) throw new AppError('Unit not found in your course');
  return unit;
};
export const createLesson = asynchandler(async (req, res, next) => {
  const { unitId } = req.body;
 
  await verifyUnitAccess(unitId);

  // 1. Find the highest order number in this unit
  const lastLesson = await Lesson.findOne({ unitId })
    .sort('-order')
    .select('order')
    .lean();

  const nextOrder = lastLesson ? lastLesson.order + 1 : 1;
  const lesson = await Lesson.create({
    ...req.body,
    order: nextOrder,
    islocked: nextOrder !== 1 
  });

  res.status(201).json({
    success: true,
    message: "Lesson created successfully",
    data: {
      id: lesson._id,
      title: lesson.title,
      description: lesson.description,
      order: lesson.order, // Will show auto-assigned order
      unitId: lesson.unitId,
      islocked: lesson.islocked,
      createdAt: lesson.createdAt
    }
  });
});





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

res.status(201).json({message:'Lesson Details ',lesson});

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




export const markLessonAsCompleted = asynchandler(async (req, res) => {
  const { lessonId } = req.params;

  const lesson = await Lesson.findById(lessonId);

  if (!lesson) {
    throw new AppError('Lesson not found', 404);
  }
  if (lesson.completed) {
    return res.status(200).json({
      success: true,
      message: 'Lesson already marked as completed',
      data: {
        id: lesson._id,
        completed: lesson.completed,
      },
    });
  }

  lesson.completed = true;
  await lesson.save();

  res.status(200).json({
    success: true,
    message: 'Lesson marked as completed',
    data: {
      id: lesson._id,
      completed: lesson.completed,
    },
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
      data:lesson
    });
    
  
});




export const updateLesson = asynchandler(async (req, res, next) => {
  const { lessonId } = req.params;


  const lesson = await Lesson.findById(lessonId)
    .populate({
      path: 'unitId',
      select: 'courseId',
      populate: {
        path: 'courseId',
        select: 'CreatedBy'
      }
    });

  if (!lesson) {
    throw new AppError('Lesson not found', 404);
  }

  const updatableFields = [
    'title',
    'description',
    'content',
    'resources',
    'islocked',
    'completionCriteria',
    'passingScore',
    'quizId'
  ];

  updatableFields.forEach(field => {
    if (req.body[field] !== undefined) {
      lesson[field] = req.body[field];
    }
  });

  const updatedLesson = await lesson.save();

  res.json({
    success: true,
    data:updatedLesson
  });
});

