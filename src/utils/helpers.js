import Course from "../models/Course.js";

// Checks if a course is approved

export const isCourseApproved = async (courseId) => {
  const course = await Course.findById(courseId).select('isApproved'); // or select('status')

  if (!course) {
    throw new Error('course_not_found');
  }

  return Course.isApproved === true;
};






export const Roles = {
    Admin: "admin",
    Student: "student",
    instructor: "instructor"

}

export const AccessRoles = {
    create: [Roles.Admin],
    general: [Roles.Admin, Roles.Student, Roles.instructor],
    Admin: [Roles.Admin],
    Student: [Roles.Student],
    DoupleRole: [Roles.instructor, Roles.Admin],
    instructor: [Roles.instructor]

}




export const normalizeUnitBody = (req, res, next) => {
  if (typeof req.body.topic === 'string') {
    try {
      req.body.topic = JSON.parse(req.body.topic);
    } catch (err) {
      req.body.topic = [req.body.topic]; 
    }
  }

  next();
};






// isScheduleSuitable.js
// utils/isScheduleSuitable.js
export function isScheduleSuitable(schedule, availableTime) {
  for (const slot of schedule) {
    const day = slot.dayOfWeek.toLowerCase();
    console.log({'day':day});
    
    const startHour = parseInt(slot.startTime.split(':')[0]);
    const endHour = parseInt(slot.endTime.split(':')[0]);

    const available = availableTime[day];
 console.log({'availableTime[day]':available});

    if (!available) {
      return {
        suitable: false,
        reason: `Instructor not available on ${day}`
      };
    }

    if (startHour < available.from || endHour > available.to) {
      return {
        suitable: false,
        reason: `Time on ${day} is outside of available range (${available.from} - ${available.to})`
      };
    }
  }

  return { suitable: true };
}





export function isScheduleConflict(newSchedule, existingGroups) {
  const toMinutes = timeStr => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const allExistingSlots = existingGroups.flatMap(group =>
    group.schedule.map(slot => ({ ...slot, groupCode: group.code }))
  );

  for (const newSlot of newSchedule) {
    if (!newSlot?.dayOfWeek || !newSlot?.startTime || !newSlot?.endTime) {
      continue;
    }

    const newDay = newSlot.dayOfWeek.toLowerCase();
    const newStart = toMinutes(newSlot.startTime);
    const newEnd = toMinutes(newSlot.endTime);

    for (const existing of allExistingSlots) {
      const existingDay = existing.dayOfWeek.toLowerCase();
      const existingStart = toMinutes(existing.startTime);
      const existingEnd = toMinutes(existing.endTime);

      const isSameDay = newDay === existingDay;
      const isOverlap = newStart < existingEnd && newEnd > existingStart;

      if (isSameDay && isOverlap) {
        return {
          suitable: false,
          day: newDay,
          conflictWith: existing.groupCode
        };
      }
    }
  }

  return { suitable: true };
}






