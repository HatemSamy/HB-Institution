import { asynchandler, AppError } from "../middleware/erroeHandling.js";
import Meeting from "../models/Meeting.js";
import Attendance from "../models/Attendance.js";

/**
 * End a meeting (instructor only)
 * Changes status from active to ended and updates attendance
 */
export const endMeeting = asynchandler(async (req, res) => {
  const { meetingId } = req.params;
  const instructorId = req.user._id;
  const userRole = req.user.role;

  if (userRole !== 'instructor') {
    throw new AppError('Only instructors can end meetings', 403);
  }

  // Find the meeting
  const meeting = await Meeting.findOne({ meetingID: meetingId })
    .populate('lessonId', 'title')
    .populate('groupId', 'code');

  if (!meeting) {
    throw new AppError('Meeting not found', 404);
  }

  // Check if instructor is authorized
  if (!meeting.instructorId.equals(instructorId)) {
    throw new AppError('You are not authorized to end this meeting', 403);
  }

  // Check if meeting is active
  if (meeting.status !== 'active') {
    throw new AppError('Meeting is not active', 400);
  }

  // End the meeting
  const endTime = new Date();
  meeting.status = 'ended';
  meeting.actualEndTime = endTime;
  await meeting.save();

  // Update attendance records with leave times
  const attendanceRecords = await Attendance.find({ 
    meetingId: meetingId,
    status: { $ne: 'instructor-joined' } // Only student records
  });

  // Calculate duration for students who joined
  for (const record of attendanceRecords) {
    if (record.joinTime && !record.leaveTime) {
      record.leaveTime = endTime;
      record.duration = Math.round((endTime - record.joinTime) / (1000 * 60)); // minutes
      
      // Update status based on duration (optional)
      const meetingDuration = meeting.duration || 60;
      const attendancePercentage = (record.duration / meetingDuration) * 100;
      
      if (attendancePercentage < 50) {
        record.status = 'left-early';
      }
      
      await record.save();
    }
  }

  // Mark attendance as generated
  meeting.attendanceGenerated = true;
  meeting.attendanceGeneratedAt = endTime;
  await meeting.save();

  console.log(`🏁 Meeting ended by instructor at ${endTime.toISOString()}`);

  res.status(200).json({
    success: true,
    message: 'Meeting ended successfully',
    data: {
      meeting: {
        id: meeting._id,
        meetingID: meeting.meetingID,
        title: meeting.title,
        status: meeting.status,
        actualEndTime: meeting.actualEndTime,
        duration: meeting.actualDuration
      },
      attendanceUpdated: attendanceRecords.length,
      attendanceGenerated: true
    }
  });
});

/**
 * Update late threshold configuration
 */
export const updateLateThreshold = asynchandler(async (req, res) => {
  const { threshold } = req.body; // in minutes
  const userRole = req.user.role;

  if (userRole !== 'instructor') {
    throw new AppError('Only instructors can update settings', 403);
  }

  // Validate threshold
  if (!threshold || threshold < 0 || threshold > 60) {
    throw new AppError('Late threshold must be between 0 and 60 minutes', 400);
  }

  // For now, we'll return the setting (you can store this in database later)
  res.status(200).json({
    success: true,
    message: 'Late threshold updated',
    data: {
      lateThreshold: threshold,
      description: `Students joining more than ${threshold} minutes after scheduled start will be marked as late`
    }
  });
});

/**
 * Get attendance configuration
 */
export const getAttendanceConfig = asynchandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      lateThreshold: 15, // minutes
      attendanceRules: {
        present: 'Joined within grace period',
        late: 'Joined after grace period',
        absent: 'Never joined the meeting',
        leftEarly: 'Left before 50% of meeting completed'
      },
      instructorFirst: true,
      description: 'Instructor must join before students can enter'
    }
  });
});