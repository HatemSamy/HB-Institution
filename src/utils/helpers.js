import Course from "../models/Course.js";
import { fileValidation } from "../services/multer.js";
import cloudinary from "../utils/cloudinary.js";

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
    DoupleRole: [Roles.instructor, Roles.Student],
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

export function getFileType(mimetype) {
  if (fileValidation.pdf.includes(mimetype)) return 'pdf';
  if (fileValidation.document.includes(mimetype)) return 'doc';
  if (fileValidation.presentation.includes(mimetype)) return 'ppt';
  if (fileValidation.archive.includes(mimetype)) return 'zip';
  return 'other';
}

export const uploadResourceToCloudinary = async (file) => {
  if (!file) throw new Error('No file provided');

  const result = await cloudinary.uploader.upload(file.path, {
    resource_type: "raw",
    folder: "lesson-resources",
    format: "pdf",
  });

  return {
    url: result.secure_url,
    public_id: result.public_id,
    type: 'pdf',
    filename: file.originalname,
  };
};




