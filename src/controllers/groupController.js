// controllers/groupController.js
import { AppError, asynchandler } from '../middleware/erroeHandling.js';
import ClassSelectionModel from '../models/ClassSelection.js';
import Group from '../models/Group.js';
import User from '../models/User.js';
import { isScheduleConflict, isScheduleSuitable } from '../utils/helpers.js';

// export const createGroup = asynchandler(async (req, res) => {
//   try {
//     const {
//       code,
//       courseId,
//       instructorId,
//       level,
//       maxStudents,
//       schedule
//     } = req.body;

    
//     const instructor = await User.findOne({ _id: instructorId, role: 'instructor' });
//     console.log(instructor);
    
//     if (!instructor) {
//       return res.status(400).json({ message: 'Invalid instructor ID' });
//     }

//     const group = await Group.create({
//       code,
//       courseId,
//       instructorId,
//       level,
//       maxStudents,
//       schedule
//     });

//     res.status(201).json({ message: 'Group created and instructor assigned', group });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Server error', error: err.message });
//   }
// }
// )





// controllers/groupController.js








// export const createGroup = asynchandler(async (req, res) => {
//   const {
//     code,
//     courseId,
//     instructorId,
//     level,
//     maxStudents,
//     schedule
//   } = req.body;

//   console.log({ schedule });

//   // 1. Check if instructor exists
//   const instructor = await User.findOne({ _id: instructorId, role: 'instructor' });
//   if (!instructor) {
//     return res.status(400).json({ message: 'Invalid instructor ID' });
//   }

//   // 2. Normalize availability (in case it's a Map)
//   let availability = instructor.availableTime || {};
//   if (availability instanceof Map) {
//     availability = Object.fromEntries(availability.entries());
//   } else if (typeof availability.toObject === 'function') {
//     availability = availability.toObject();
//   }

//   // Normalize keys to lowercase (important for matching dayOfWeek)
//   availability = Object.fromEntries(
//     Object.entries(availability).map(([key, value]) => [key.toLowerCase(), value])
//   );

//   console.log({ availability });

//   // 3. Check if schedule fits instructor availability
//   const suitable = isScheduleSuitable(schedule, availability);
//   if (!suitable.suitable) {
//     return res.status(400).json({
//       message: 'Schedule is outside instructor availability',
//       reason: suitable.reason
//     });
//   }

//   // 4. Check for schedule conflict with existing groups
//   const instructorGroups = await Group.find({ instructorId });
// const conflictResult = isScheduleConflict(schedule, instructorGroups);
// if (!conflictResult.suitable) {
//   return res.status(400).json({
//     message: 'Schedule conflict with another group',
//     conflictWith: conflictResult.conflictWith,
//     day: conflictResult.day
//   });
// }

//   // 5. Create new group
//   const group = await Group.create({
//     code,
//     courseId,
//     instructorId,
//     level,
//     maxStudents,
//     schedule
//   });

//   res.status(201).json({
//     message: 'Group created successfully',
//     group
//   });
// })









export const updateGroup = asynchandler(async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // If updating instructorId, verify the new instructor exists and is actually an instructor
    if (updates.instructorId) {
      const instructor = await User.findOne({ 
        _id: updates.instructorId, 
        role: 'instructor' 
      });
      if (!instructor) {
        return res.status(400).json({ message: 'Invalid instructor ID' });
      }
    }

    const group = await Group.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true } 
    );

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    res.status(200).json({ message: 'Group updated successfully', group });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});





export const deleteGroup = asynchandler(async (req, res, next) => {
  const { groupId } = req.params;

  const group = await Group.findById(groupId);
  if (!group) {
    return next(new AppError('Group not found', 404));
  }

  await Group.findByIdAndDelete(groupId);

  await ClassSelectionModel.deleteMany({ groupId });

  res.status(200).json({
    success: true,
    message: 'Group and related class selections deleted successfully'
  });
});




// Helper function to convert time string to minutes for comparison
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Helper function to check if two time ranges overlap
const timesOverlap = (start1, end1, start2, end2) => {
  const start1Min = timeToMinutes(start1);
  const end1Min = timeToMinutes(end1);
  const start2Min = timeToMinutes(start2);
  const end2Min = timeToMinutes(end2);
  
  return start1Min < end2Min && start2Min < end1Min;
};

// Helper function to normalize day names
const normalizeDay = (day) => {
  const dayMap = {
    'monday': 'monday',
    'tuesday': 'tuesday', 
    'wednesday': 'wednesday',
    'thursday': 'thursday',
    'friday': 'friday',
    'saturday': 'saturday',
    'sunday': 'sunday'
  };
  return dayMap[day.toLowerCase()];
};







// Create group with instructor availability check
export const createGroup = asynchandler(async (req, res, next) => {
  const { code, courseId, instructorId, level, maxStudents, schedule } = req.body;

  // Check if instructor exists
  const instructor = await User.findById(instructorId);
  if (!instructor) {
    return next(new AppError('Instructor not found', 404));
  }

  // Check if group code already exists
  const existingGroup = await Group.findOne({ code });
  if (existingGroup) {
    return next(new AppError('Group code already exists', 400));
  }

  // Validate schedule format and check instructor availability
  for (const scheduleItem of schedule) {
    const { dayOfWeek, startTime, endTime } = scheduleItem;
    
    if (!dayOfWeek || !startTime || !endTime) {
      return next(new AppError('Each schedule item must have dayOfWeek, startTime, and endTime', 400));
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return next(new AppError('Time must be in HH:MM format', 400));
    }

    // Check if start time is before end time
    if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
      return next(new AppError(`Start time must be before end time for ${dayOfWeek}`, 400));
    }

    const normalizedDay = normalizeDay(dayOfWeek);
    if (!normalizedDay) {
      return next(new AppError(`Invalid day: ${dayOfWeek}`, 400));
    }

    // Check if instructor is available on this day
    const instructorAvailability = instructor.availableTime;
    if (!instructorAvailability || !instructorAvailability.has(normalizedDay)) {
      return next(new AppError(`Instructor is not available on ${dayOfWeek}`, 400));
    }

    const availableSlot = instructorAvailability.get(normalizedDay);
    const availableStartMin = availableSlot.from * 60;
    const availableEndMin = availableSlot.to * 60;
    const requestedStartMin = timeToMinutes(startTime);
    const requestedEndMin = timeToMinutes(endTime);

    // Check if requested time is within instructor's available hours
    if (requestedStartMin < availableStartMin || requestedEndMin > availableEndMin) {
      return next(new AppError(
        `Instructor is only available from ${availableSlot.from}:00 to ${availableSlot.to}:00 on ${dayOfWeek}`, 
        400
      ));
    }

    // Check for conflicts with existing groups for the same instructor
    const conflictingGroups = await Group.find({
      instructorId: instructorId,
      isActive: true,
      'schedule.dayOfWeek': { $regex: new RegExp(`^${dayOfWeek}$`, 'i') }
    });

    for (const group of conflictingGroups) {
      const conflictingSchedules = group.schedule.filter(
        s => normalizeDay(s.dayOfWeek) === normalizedDay
      );

      for (const conflictSchedule of conflictingSchedules) {
        if (timesOverlap(startTime, endTime, conflictSchedule.startTime, conflictSchedule.endTime)) {
          return next(new AppError(
            `Time conflict: Instructor already has group "${group.code}" on ${dayOfWeek} from ${conflictSchedule.startTime} to ${conflictSchedule.endTime}`,
            400
          ));
        }
      }
    }
  }

  // If all validations pass, create the group
  const newGroup = new Group({
    code,
    courseId,
    instructorId,
    level,
    maxStudents: maxStudents || 30,
    currentStudents: 0,
    schedule: schedule.map(item => ({
      dayOfWeek: item.dayOfWeek,
      startTime: item.startTime,
      endTime: item.endTime,
      timezone: item.timezone || 'UTC'
    })),
    isActive: true
  });

  await newGroup.save();

  // Populate the response
  await newGroup.populate([
    { path: 'courseId', select: 'name description' },
    { path: 'instructorId', select: 'firstName lastName email' }
  ]);

  res.status(201).json({
    success: true,
    message: 'Group created successfully',
    data: newGroup
  });
});