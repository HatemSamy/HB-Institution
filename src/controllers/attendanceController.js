import { asynchandler, AppError } from "../middleware/erroeHandling.js";
import Attendance from "../models/Attendance.js";
import Meeting from "../models/Meeting.js";
import Lesson from "../models/Lesson.js";
import User from "../models/User.js";
import ClassSelectionModel from "../models/ClassSelection.js";

/**
 * Get attendance report for a specific lesson
 */
export const getLessonAttendance = asynchandler(async (req, res) => {
  const { lessonId } = req.params;
  const { groupId } = req.query;
  const userRole = req.user.role;
  const userId = req.user._id;

  // Find the lesson
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) {
    throw new AppError('Lesson not found', 404);
  }

  // Find meeting for this lesson and group
  let query = { lessonId };
  if (groupId) query.groupId = groupId;

  const meeting = await Meeting.findOne(query)
    .populate('lessonId', 'title')
    .populate('groupId', 'code')
    .populate('instructorId', 'firstName lastName');

  if (!meeting) {
    return res.status(200).json({
      success: true,
      message: 'No meeting found for this lesson',
      data: {
        lesson: {
          id: lesson._id,
          title: lesson.title
        },
        meeting: null,
        attendance: [],
        summary: {
          total: 0,
          present: 0,
          late: 0,
          absent: 0,
          leftEarly: 0,
          attendanceRate: 0
        }
      }
    });
  }

  // Check authorization for instructors
  if (userRole === 'instructor' && !meeting.instructorId._id.equals(userId)) {
    throw new AppError('You are not authorized to view this attendance report', 403);
  }

  // Get attendance records for this meeting (exclude instructor records)
  const attendance = await Attendance.find({ 
    meetingId: meeting.meetingID,
    status: { $ne: 'instructor-joined' } // Exclude instructor join records
  })
    .populate('studentId', 'firstName lastName email')
    .sort({ studentName: 1 });

  // Calculate summary statistics
  const summary = {
    total: attendance.length,
    present: attendance.filter(a => a.status === 'present').length,
    late: attendance.filter(a => a.status === 'late').length,
    absent: attendance.filter(a => a.status === 'absent').length,
    leftEarly: attendance.filter(a => a.status === 'left-early').length
  };

  // Calculate attendance rate
  summary.attendanceRate = summary.total > 0 ? 
    Math.round(((summary.present + summary.late) / summary.total) * 100) : 0;

  res.status(200).json({
    success: true,
    message: 'Lesson attendance retrieved successfully',
    data: {
      lesson: {
        id: lesson._id,
        title: lesson.title
      },
      meeting: {
        id: meeting._id,
        meetingID: meeting.meetingID,
        group: meeting.groupId.code,
        instructor: `${meeting.instructorId.firstName} ${meeting.instructorId.lastName}`,
        scheduledStartTime: meeting.scheduledStartTime,
        actualStartTime: meeting.actualStartTime,
        duration: meeting.duration,
        status: meeting.status,
        attendanceGenerated: meeting.attendanceGenerated || false
      },
      summary,
      attendance: attendance.map(record => ({
        id: record._id,
        student: {
          id: record.studentId._id,
          name: record.studentName,
          email: record.studentId.email
        },
        status: record.status,
        joinTime: record.joinTime,
        leaveTime: record.leaveTime,
        duration: record.duration,
        isManuallyMarked: record.isManuallyMarked,
        notes: record.notes
      }))
    }
  });
});

/**
 * Manually mark attendance for a lesson (instructor only)
 */
export const markLessonAttendance = asynchandler(async (req, res) => {
  const { lessonId } = req.params;
  const { studentId, status, notes = '', groupId } = req.body;
  const instructorId = req.user._id;
  const userRole = req.user.role;

  if (userRole !== 'instructor') {
    throw new AppError('Only instructors can manually mark attendance', 403);
  }

  // Validate status
  const validStatuses = ['present', 'late', 'absent', 'left-early'];
  if (!validStatuses.includes(status)) {
    throw new AppError('Invalid attendance status', 400);
  }

  // Find the meeting for this lesson
  let query = { lessonId };
  if (groupId) query.groupId = groupId;

  const meeting = await Meeting.findOne(query);
  if (!meeting) {
    throw new AppError('No meeting found for this lesson', 404);
  }

  // Check if instructor is authorized for this meeting
  if (!meeting.instructorId.equals(instructorId)) {
    throw new AppError('You are not authorized to mark attendance for this lesson', 403);
  }

  // Find or create attendance record
  let attendance = await Attendance.findOne({ 
    meetingId: meeting.meetingID, 
    studentId 
  });

  if (!attendance) {
    // Create new attendance record
    const student = await User.findById(studentId);
    if (!student) {
      throw new AppError('Student not found', 404);
    }

    attendance = new Attendance({
      meetingId: meeting.meetingID,
      lessonId: meeting.lessonId,
      groupId: meeting.groupId,
      studentId,
      studentName: `${student.firstName} ${student.lastName}`,
      status: 'absent'
    });
  }

  // Mark manually
  await attendance.markManually(status, instructorId, notes);

  res.status(200).json({
    success: true,
    message: 'Lesson attendance marked successfully',
    data: {
      lesson: {
        id: lessonId,
        meetingId: meeting.meetingID
      },
      attendance: {
        id: attendance._id,
        studentName: attendance.studentName,
        status: attendance.status,
        isManuallyMarked: attendance.isManuallyMarked,
        notes: attendance.notes,
        markedAt: attendance.manuallyMarkedAt
      }
    }
  });
});

/**
 * Export lesson attendance report
 */
export const exportLessonAttendance = asynchandler(async (req, res) => {
  const { lessonId } = req.params;
  const { groupId, format = 'json' } = req.query;

  // Find the meeting for this lesson
  let query = { lessonId };
  if (groupId) query.groupId = groupId;

  const meeting = await Meeting.findOne(query)
    .populate('lessonId', 'title')
    .populate('groupId', 'code');

  if (!meeting) {
    throw new AppError('No meeting found for this lesson', 404);
  }

  // Get attendance records (exclude instructor records)
  const attendance = await Attendance.find({ 
    meetingId: meeting.meetingID,
    status: { $ne: 'instructor-joined' }
  })
    .populate('studentId', 'firstName lastName email')
    .sort({ studentName: 1 });

  if (format === 'csv') {
    // Generate CSV
    const csvHeader = 'Student Name,Email,Status,Join Time,Leave Time,Duration (minutes),Notes\n';
    const csvRows = attendance.map(record => {
      return [
        record.studentName,
        record.studentId.email || '',
        record.status,
        record.joinTime ? record.joinTime.toISOString() : '',
        record.leaveTime ? record.leaveTime.toISOString() : '',
        record.duration || 0,
        record.notes || ''
      ].join(',');
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="lesson-${lessonId}-attendance.csv"`);
    res.send(csvContent);
  } else {
    // Return JSON
    res.status(200).json({
      success: true,
      message: 'Lesson attendance exported successfully',
      data: {
        lesson: {
          id: meeting.lessonId._id,
          title: meeting.lessonId.title
        },
        group: {
          id: meeting.groupId._id,
          code: meeting.groupId.code
        },
        meeting: {
          id: meeting._id,
          meetingID: meeting.meetingID,
          scheduledStartTime: meeting.scheduledStartTime
        },
        attendance
      }
    });
  }
});