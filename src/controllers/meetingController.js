import { asynchandler, AppError } from "../middleware/erroeHandling.js";
import Lesson from "../models/Lesson.js";
import Meeting from "../models/Meeting.js";
import Group from "../models/Group.js";
import ClassSelectionModel from "../models/ClassSelection.js";
import bigBlueButtonService from "../services/bigBlueButtonService.js";
import NotificationService from "../services/notificationService.js";
import { normalizeISODate, validateMeetingDateTime, parseSimpleDateAndTime } from "../middleware/dateValidation.js";

export const createMeeting = asynchandler(async (req, res, next) => {
  const { 
    lessonId, 
    groupId, 
    duration, 
    scheduledStartTime, 
    scheduledDate,      
    scheduledTime,      
    dateFormat          // Optional: "DD/MM/YYYY" or "MM/DD/YYYY"
  } = req.body;
  const instructorId = req.user._id;

  // Verify the lesson exists
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) {
    throw new AppError('Lesson not found', 404);
  }

  // Verify the group exists and instructor has access
  const group = await Group.findById(groupId).populate('instructorId', 'firstName lastName');
  if (!group) {
    throw new AppError('Group not found', 404);
  }

  // Check if the instructor is authorized for this group
  if (!group.instructorId._id.equals(instructorId)) {
    throw new AppError('You are not authorized to create meetings for this group', 403);
  }

  // Check if lesson is unlocked for this group
  if (!lesson.unlockedForGroups.includes(groupId)) {
    throw new AppError('This lesson is not unlocked for the specified group', 400);
  }

  const instructorFullName = `${group.instructorId.firstName || ''} ${group.instructorId.lastName || ''}`.trim();
  const now = new Date();
  
  // Parse and validate the scheduled start time
  let startTime;
  let isImmediate;
  
  if (scheduledDate && scheduledTime) {
    // New simple format: separate date and time
    try {
      startTime = parseSimpleDateAndTime(scheduledDate, scheduledTime, dateFormat || "DD/MM/YYYY");
      const validation = validateMeetingDateTime(startTime, duration || 120);
      isImmediate = validation.isImmediate;
      
      console.log(`📅 Parsed date/time: ${scheduledDate} ${scheduledTime} -> ${startTime.toLocaleString()}`);
    } catch (error) {
      throw new AppError(error.message, 400);
    }
  } else if (scheduledDate && !scheduledTime) {
    // Date provided but no time - default to current time or 00:00
    try {
      const defaultTime = "00:00"; // You can change this to current time if preferred
      startTime = parseSimpleDateAndTime(scheduledDate, defaultTime, dateFormat || "DD/MM/YYYY");
      const validation = validateMeetingDateTime(startTime, duration || 120);
      isImmediate = validation.isImmediate;
      
      console.log(`📅 Parsed date with default time: ${scheduledDate} -> ${startTime.toLocaleString()}`);
    } catch (error) {
      throw new AppError(error.message, 400);
    }
  } else if (scheduledStartTime) {
    // Legacy ISO format support
    try {
      startTime = normalizeISODate(scheduledStartTime);
      const validation = validateMeetingDateTime(startTime, duration || 120);
      isImmediate = validation.isImmediate;
      
      console.log(`📅 Parsed ISO date: ${scheduledStartTime} -> ${startTime.toLocaleString()}`);
    } catch (error) {
      throw new AppError(error.message, 400);
    }
  } else {
    // No date/time provided - immediate meeting
    startTime = now;
    isImmediate = true;
    console.log(`📅 Immediate meeting: ${startTime.toLocaleString()}`);
  }

  // Check for existing meetings
  const existingMeeting = await Meeting.findOne({
    lessonId: lessonId,
    groupId: groupId,
    status: { $in: ['scheduled', 'active'] }
  });

  if (existingMeeting) {
    const statusText = existingMeeting.status === 'active' ? 'active' : 'scheduled';
    throw new AppError(`A ${statusText} meeting already exists for this lesson and group`, 400);
  }

  try {
    // Create BBB meeting
    const meetingData = {
      lessonId: lesson._id.toString(),
      lessonTitle: lesson.title,
      groupCode: group.code,
      instructorName: instructorFullName,
      duration: duration || 120
    };

    const meetingResponse = await bigBlueButtonService.createMeeting(meetingData);
    if (!meetingResponse.success) {
      throw new AppError('Failed to create meeting on server', 500);
    }

    // Set status based on timing
    const meetingStatus = isImmediate ? 'active' : 'scheduled';

    // Save meeting to database
    const meeting = new Meeting({
      meetingID: meetingResponse.meetingID,
      title: lesson.title,
      lessonId: lessonId,
      groupId: groupId,
      instructorId: instructorId,
      status: meetingStatus,
      scheduledStartTime: startTime,
      actualStartTime: isImmediate ? now : null,
      duration: duration || 120
    });

    await meeting.save();

    // Generate tracked URLs for attendance tracking
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    const apiBase = `${baseUrl}/api/v1`;

    const trackedInstructorURL = `${apiBase}/join/${meetingResponse.meetingID}/instructor/${instructorId}?role=instructor`;
    const trackedStudentURLTemplate = `${apiBase}/join/${meetingResponse.meetingID}/student/STUDENT_ID?role=student`;

    // Also generate original BBB URLs for backup
    const originalInstructorURL = bigBlueButtonService.generateJoinURL({
      meetingID: meetingResponse.meetingID,
      fullName: instructorFullName,
      role: 'instructor',
      userID: instructorId.toString()
    });

    const originalStudentURL = bigBlueButtonService.generateJoinURL({
      meetingID: meetingResponse.meetingID,
      fullName: 'Student',
      role: 'student',
      userID: 'student-generic'
    });

    // Store both tracked and original URLs
    meeting.meetingUrls = {
      instructorJoinUrl: trackedInstructorURL,
      studentJoinUrl: trackedStudentURLTemplate,
      // Store original URLs for reference
      originalInstructorUrl: originalInstructorURL,
      originalStudentUrl: originalStudentURL
    };
    await meeting.save();

    // Get enrolled students and generate individual tracked URLs
    const enrolledStudents = await ClassSelectionModel.find({
      groupId: groupId,
      status: 'confirmed'
    }).populate('studentId', 'firstName lastName email');

    // Remove duplicates
    const uniqueStudents = [];
    const seenStudentIds = new Set();
    
    for (const enrollment of enrolledStudents) {
      const studentId = enrollment.studentId._id.toString();
      if (!seenStudentIds.has(studentId)) {
        seenStudentIds.add(studentId);
        uniqueStudents.push(enrollment);
      }
    }

    // Generate individual tracked URLs for each student
    const studentTrackedUrls = uniqueStudents.map(enrollment => ({
      studentId: enrollment.studentId._id,
      studentName: `${enrollment.studentId.firstName} ${enrollment.studentId.lastName}`,
      email: enrollment.studentId.email,
      trackedUrl: `${apiBase}/join/${meetingResponse.meetingID}/student/${enrollment.studentId._id}?role=student`
    }));

    // For immediate meetings, send notifications with tracked URLs
    let notificationResult = null;
    
    if (isImmediate) {
      // Send immediate meeting notifications
      notificationResult = await NotificationService.createMeetingNotifications({
        lessonId: lesson._id,
        lessonTitle: lesson.title,
        groupId: groupId,
        groupCode: group.code,
        instructorId: instructorId,
        instructorName: instructorFullName,
        meetingId: meetingResponse.meetingID,
        duration: meeting.duration,
        type: 'meeting_created'
      });
      
      console.log(`📢 Immediate meeting notifications sent to ${notificationResult.notificationsCreated} students with tracked URLs`);
    } else {
      console.log(`📅 Meeting scheduled for ${startTime.toLocaleString()}`);
      console.log(`⏰ 3-minute reminder will be sent at ${new Date(startTime.getTime() - 3 * 60 * 1000).toLocaleString()}`);
    }

    const message = isImmediate 
      ? `Meeting started! Tracked join URLs generated and notifications sent to ${notificationResult?.notificationsCreated || 0} students`
      : `Meeting scheduled for ${startTime.toLocaleString()}. Tracked join URLs ready. 3-minute reminder will be sent automatically.`;

    res.status(201).json({
      success: true,
      message,
      data: {
        meeting: {
          id: meeting._id,
          meetingID: meeting.meetingID,
          title: meeting.title,
          status: meeting.status,
          duration: meeting.duration,
          scheduledStartTime: meeting.scheduledStartTime,
          actualStartTime: meeting.actualStartTime
        },
        joinURLs: {
          instructor: trackedInstructorURL,
          studentTemplate: trackedStudentURLTemplate,
          // Individual student URLs for notifications/emails
          students: studentTrackedUrls
        },
        attendanceTracking: {
          enabled: true,
          type: 'url-tracking',
          totalStudents: uniqueStudents.length,
          instructorFirst: true
        },
        totalStudents: uniqueStudents.length,
        isImmediate,
        reminderScheduled: !isImmediate,
        trackingMode: "url-based-attendance"
      }
    });

  } catch (error) {
    console.error('Error creating meeting:', error);
    throw new AppError(error.message || 'Failed to create meeting', 500);
  }
});

/**
 * Get instructor's meetings with tracked URLs
 */
export const getInstructorMeetings = asynchandler(async (req, res, next) => {
  const instructorId = req.user._id;
  const userRole = req.user.role;
  const { status } = req.query;

  let query = { instructorId };
  if (status) {
    query.status = status;
  }

  const meetings = await Meeting.find(query)
    .populate('lessonId', 'title')
    .populate('groupId', 'code')
    .sort({ scheduledStartTime: -1 })
    .limit(50);

  // Check status of active meetings by querying BBB server
  for (const meeting of meetings) {
    if (meeting.status === 'active') {
      try {
        const isRunning = await bigBlueButtonService.isMeetingRunning(meeting.meetingID);
        if (!isRunning) {
          await meeting.endMeeting();
        }
      } catch (error) {
        console.error(`Error checking meeting ${meeting.meetingID}:`, error);
      }
    }
  }

  res.status(200).json({
    success: true,
    data: {
      meetings: meetings.map(meeting => ({
        id: meeting._id,
        title: meeting.title,
        status: meeting.status,
        lesson: meeting.lessonId.title,
        group: meeting.groupId.code,
        duration: meeting.duration,
        scheduledStartTime: meeting.scheduledStartTime,
        actualStartTime: meeting.actualStartTime,
        actualEndTime: meeting.actualEndTime,
        meetingUrl: userRole === 'instructor' 
          ? meeting.meetingUrls?.instructorJoinUrl 
          : meeting.meetingUrls?.studentJoinUrl, // Tracked URLs
        trackingEnabled: true
      }))
    }
  });
});

/**
 * Get meeting details with tracked URLs
 */
export const getMeetingDetails = asynchandler(async (req, res, next) => {
  const { meetingId } = req.params;
  const userId = req.user._id;
  const userRole = req.user.role;

  const meeting = await Meeting.findById(meetingId)
    .populate('lessonId', 'title')
    .populate('groupId', 'code')
    .populate('instructorId', 'firstName lastName');

  if (!meeting) {
    throw new AppError('Meeting not found', 404);
  }

  // Check if user has access to this meeting
  if (userRole === 'instructor' && !meeting.instructorId._id.equals(userId)) {
    throw new AppError('You are not authorized to view this meeting', 403);
  }

  if (userRole === 'student') {
    const enrollment = await ClassSelectionModel.findOne({
      studentId: userId,
      groupId: meeting.groupId._id,
      status: 'confirmed'
    });
    
    if (!enrollment) {
      throw new AppError('You are not enrolled in this group', 403);
    }
  }

  // Generate user-specific tracked URL
  const baseUrl = process.env.APP_URL || 'http://localhost:3000';
  const apiBase = `${baseUrl}/api/v1`;
  
  let userTrackedUrl = null;
  if (userRole === 'instructor') {
    userTrackedUrl = `${apiBase}/join/${meeting.meetingID}/instructor/${userId}?role=instructor`;
  } else {
    userTrackedUrl = `${apiBase}/join/${meeting.meetingID}/student/${userId}?role=student`;
  }

  res.status(200).json({
    success: true,
    data: {
      meeting: {
        id: meeting._id,
        meetingID: meeting.meetingID,
        title: meeting.title,
        status: meeting.status,
        scheduledStartTime: meeting.scheduledStartTime,
        actualStartTime: meeting.actualStartTime,
        actualEndTime: meeting.actualEndTime,
        duration: meeting.duration,
        lesson: meeting.lessonId.title,
        group: meeting.groupId.code,
        instructor: `${meeting.instructorId.firstName} ${meeting.instructorId.lastName}`,
        meetingUrl: userTrackedUrl, // User-specific tracked URL
        trackingEnabled: true,
        attendanceTracking: 'url-based'
      }
    }
  });
});