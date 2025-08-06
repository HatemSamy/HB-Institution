import { asynchandler, AppError } from "../middleware/erroeHandling.js";
import Meeting from "../models/Meeting.js";
import Attendance from "../models/Attendance.js";
import User from "../models/User.js";
import ClassSelectionModel from "../models/ClassSelection.js";
import bigBlueButtonService from "../services/bigBlueButtonService.js";

/**
 * Track student/instructor join attempt and redirect to BBB
 * RULE: Instructor must join first before students can join
 */
export const trackAndRedirectToMeeting = asynchandler(async (req, res) => {
  const { meetingId, userId } = req.params;
  const { role = 'student' } = req.query;
  
  console.log(`🔗 Join URL tracking: User ${userId} (${role}) attempting to join meeting ${meetingId}`);
  
  try {
    // Find the meeting
    const meeting = await Meeting.findOne({ meetingID: meetingId })
      .populate('lessonId', 'title')
      .populate('groupId', 'code')
      .populate('instructorId', 'firstName lastName');

    if (!meeting) {
      throw new AppError('Meeting not found', 404);
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if this is the instructor for this meeting
    const isInstructor = role === 'instructor' && meeting.instructorId._id.equals(userId);
    
    // For students, verify enrollment and instructor presence
    if (role === 'student') {
      const enrollment = await ClassSelectionModel.findOne({
        studentId: userId,
        groupId: meeting.groupId._id,
        status: 'confirmed'
      });
      
      if (!enrollment) {
        throw new AppError('You are not enrolled in this group', 403);
      }

      // Check if instructor has joined first
      const instructorHasJoined = await checkInstructorPresence(meetingId);
      if (!instructorHasJoined) {
        return res.status(403).json({
          success: false,
          message: 'Please wait for your instructor to start the meeting first',
          code: 'INSTRUCTOR_NOT_PRESENT',
          data: {
            meetingId,
            instructorName: `${meeting.instructorId.firstName} ${meeting.instructorId.lastName}`,
            lessonTitle: meeting.lessonId.title
          }
        });
      }
    }

    // Record attendance attempt
    if (role === 'student') {
      await recordAttendanceAttempt(meeting, user, role);
    } else if (isInstructor) {
      await recordInstructorJoin(meeting, user);
    }

    // Generate personalized BBB join URL
    const fullName = `${user.firstName} ${user.lastName}`;
    const joinURL = bigBlueButtonService.generateJoinURL({
      meetingID: meetingId,
      fullName: fullName,
      role: role,
      userID: userId
    });

    console.log(`✅ ${role === 'instructor' ? 'Instructor' : 'Student'} join approved for ${fullName}, redirecting to BBB`);

    // Redirect to BBB
    res.redirect(joinURL);

  } catch (error) {
    console.error('❌ Join tracking error:', error);
    
    // Return error page or redirect to error URL
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to join meeting',
      code: error.code || 'JOIN_ERROR',
      redirectUrl: '/meeting-error' // You can create an error page
    });
  }
});

/**
 * Check if instructor is present in the meeting
 */
const checkInstructorPresence = async (meetingId) => {
  try {
    // Method 1: Check if instructor has joined via our tracking
    const instructorAttendance = await Attendance.findOne({
      meetingId,
      status: 'instructor-joined'
    });

    if (instructorAttendance) {
      console.log('✅ Instructor presence confirmed via attendance tracking');
      return true;
    }

    // Method 2: Check if meeting is actually running on BBB server
    const isRunning = await bigBlueButtonService.isMeetingRunning(meetingId);
    if (isRunning) {
      console.log('✅ Meeting is running on BBB server, assuming instructor is present');
      return true;
    }

    console.log('❌ Instructor not present - meeting not started');
    return false;

  } catch (error) {
    console.error('Error checking instructor presence:', error);
    return false;
  }
};

/**
 * Record instructor join
 */
const recordInstructorJoin = async (meeting, instructor) => {
  const joinTime = new Date();
  const instructorName = `${instructor.firstName} ${instructor.lastName}`;

  // Record instructor join in attendance table
  const attendanceData = {
    meetingId: meeting.meetingID,
    lessonId: meeting.lessonId,
    groupId: meeting.groupId,
    studentId: instructor._id,
    studentName: instructorName,
    joinTime,
    status: 'instructor-joined',
    notes: 'Instructor started the meeting'
  };

  await Attendance.findOneAndUpdate(
    { meetingId: meeting.meetingID, studentId: instructor._id },
    attendanceData,
    { upsert: true, new: true }
  );

  // Update meeting status to active if it was scheduled
  if (meeting.status === 'scheduled') {
    meeting.status = 'active';
    meeting.actualStartTime = joinTime;
    await meeting.save();
  }

  console.log(`👨‍🏫 Instructor ${instructorName} started the meeting at ${joinTime.toISOString()}`);
};

/**
 * Record student attendance when they attempt to join
 */
const recordAttendanceAttempt = async (meeting, user, role) => {
  const joinTime = new Date();
  const studentName = `${user.firstName} ${user.lastName}`;

  // Calculate attendance status based on join time
  const status = calculateAttendanceStatus(joinTime, meeting.scheduledStartTime);

  // Create or update attendance record
  const attendanceData = {
    meetingId: meeting.meetingID,
    lessonId: meeting.lessonId,
    groupId: meeting.groupId,
    studentId: user._id,
    studentName,
    joinTime,
    status,
    notes: 'Tracked via join URL'
  };

  const attendance = await Attendance.findOneAndUpdate(
    { meetingId: meeting.meetingID, studentId: user._id },
    attendanceData,
    { upsert: true, new: true }
  );

  console.log(`📝 Student attendance recorded: ${studentName} - ${status} at ${joinTime.toISOString()}`);
  
  return attendance;
};

/**
 * Calculate attendance status based on join time
 */
const calculateAttendanceStatus = (joinTime, scheduledStart) => {
  const lateThreshold = 10; // 10 minutes
  const timeDiff = (joinTime - scheduledStart) / (1000 * 60); // minutes
  
  if (timeDiff <= lateThreshold) return 'present';
  return 'late';
};

/**
 * Generate tracked join URLs for meetings
 */
export const generateTrackedJoinURLs = asynchandler(async (req, res) => {
  const { meetingId } = req.params;
  const userId = req.user._id;
  const userRole = req.user.role;

  // Find the meeting
  const meeting = await Meeting.findOne({ meetingID: meetingId })
    .populate('instructorId', 'firstName lastName');

  if (!meeting) {
    throw new AppError('Meeting not found', 404);
  }

  // Check authorization
  if (userRole === 'instructor' && !meeting.instructorId._id.equals(userId)) {
    throw new AppError('You are not authorized to access this meeting', 403);
  }

  // Generate tracked URLs
  const baseUrl = process.env.APP_URL || 'http://localhost:3000';
  const apiBase = `${baseUrl}/api/v1`;

  const trackedUrls = {
    instructor: `${apiBase}/join/${meetingId}/instructor/${meeting.instructorId._id}?role=instructor`,
    student: `${apiBase}/join/${meetingId}/student/USER_ID?role=student` // Template URL
  };

  // For students, generate their specific URL
  if (userRole === 'student') {
    // Verify student enrollment
    const enrollment = await ClassSelectionModel.findOne({
      studentId: userId,
      groupId: meeting.groupId,
      status: 'confirmed'
    });
    
    if (!enrollment) {
      throw new AppError('You are not enrolled in this group', 403);
    }

    trackedUrls.studentPersonal = `${apiBase}/join/${meetingId}/student/${userId}?role=student`;
  }

  res.status(200).json({
    success: true,
    message: 'Tracked join URLs generated',
    data: {
      meetingId,
      trackedUrls,
      joinRules: {
        instructorFirst: true,
        message: 'Instructor must join before students can enter'
      }
    }
  });
});

/**
 * Get join statistics for a meeting
 */
export const getJoinStatistics = asynchandler(async (req, res) => {
  const { meetingId } = req.params;

  // Get attendance records (which include join attempts)
  const attendance = await Attendance.find({ meetingId })
    .populate('studentId', 'firstName lastName email')
    .sort({ joinTime: 1 });

  // Separate instructor and student records
  const instructorRecord = attendance.find(a => a.status === 'instructor-joined');
  const studentRecords = attendance.filter(a => a.status !== 'instructor-joined');

  // Calculate statistics
  const stats = {
    instructorJoined: !!instructorRecord,
    instructorJoinTime: instructorRecord?.joinTime || null,
    totalStudentAttempts: studentRecords.length,
    successfulJoins: studentRecords.filter(a => a.joinTime).length,
    studentsPresent: studentRecords.filter(a => a.status === 'present').length,
    studentsLate: studentRecords.filter(a => a.status === 'late').length,
    studentsAbsent: studentRecords.filter(a => a.status === 'absent').length,
    joinTimeline: attendance.map(a => ({
      studentName: a.studentName,
      joinTime: a.joinTime,
      status: a.status,
      role: a.status === 'instructor-joined' ? 'instructor' : 'student'
    }))
  };

  res.status(200).json({
    success: true,
    message: 'Join statistics retrieved',
    data: {
      meetingId,
      statistics: stats,
      joinRules: {
        instructorFirst: true,
        enforced: true
      }
    }
  });
});

/**
 * Bulk generate tracked URLs for all enrolled students
 */
export const generateBulkTrackedURLs = asynchandler(async (req, res) => {
  const { meetingId } = req.params;
  const userRole = req.user.role;

  if (userRole !== 'instructor') {
    throw new AppError('Only instructors can generate bulk URLs', 403);
  }

  // Find the meeting
  const meeting = await Meeting.findOne({ meetingID: meetingId })
    .populate('groupId', 'code');

  if (!meeting) {
    throw new AppError('Meeting not found', 404);
  }

  // Get all enrolled students
  const enrollments = await ClassSelectionModel.find({
    groupId: meeting.groupId._id,
    status: 'confirmed'
  }).populate('studentId', 'firstName lastName email');

  // Generate tracked URLs for all students
  const baseUrl = process.env.APP_URL || 'http://localhost:3000';
  const apiBase = `${baseUrl}/api/v1`;

  const studentUrls = enrollments.map(enrollment => ({
    studentId: enrollment.studentId._id,
    studentName: `${enrollment.studentId.firstName} ${enrollment.studentId.lastName}`,
    email: enrollment.studentId.email,
    trackedUrl: `${apiBase}/join/${meetingId}/student/${enrollment.studentId._id}?role=student`
  }));

  res.status(200).json({
    success: true,
    message: 'Bulk tracked URLs generated',
    data: {
      meetingId,
      group: meeting.groupId.code,
      totalStudents: studentUrls.length,
      studentUrls,
      joinRules: {
        instructorFirst: true,
        message: 'Students will be blocked until instructor joins first'
      }
    }
  });
});