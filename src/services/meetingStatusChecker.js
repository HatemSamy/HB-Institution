import Meeting from "../models/Meeting.js";
import Attendance from "../models/Attendance.js";
import bigBlueButtonService from "./bigBlueButtonService.js";

// State management for the checker
const checkerState = {
  checkInterval: 30000, // Check every 30 seconds
  isRunning: false,
  intervalId: null
};

// Pure function to calculate attendance percentage
const calculateAttendancePercentage = (duration, meetingDuration) => {
  return (duration / meetingDuration) * 100;
};

// Pure function to determine attendance status
const determineAttendanceStatus = (attendancePercentage, currentStatus) => {
  if (attendancePercentage < 50 && currentStatus !== 'absent') {
    return 'left-early';
  }
  return currentStatus;
};

// Pure function to create attendance notes
const createAttendanceNotes = (existingNotes, attendancePercentage) => {
  const newNote = `Left early (${Math.round(attendancePercentage)}% attendance)`;
  return existingNotes ? `${existingNotes} - ${newNote}` : newNote;
};

/**
 * Fetch all active meetings from database
 */
const fetchActiveMeetings = async () => {
  try {
    return await Meeting.find({ 
      status: 'active' 
    }).populate('lessonId', 'title');
  } catch (error) {
    console.error('❌ Error fetching active meetings:', error);
    return [];
  }
};

/**
 * Check if a meeting is still running on BBB server
 */
const checkMeetingOnBBB = async (meetingID) => {
  try {
    return await bigBlueButtonService.isMeetingRunning(meetingID);
  } catch (error) {
    console.error(`❌ Error checking meeting ${meetingID} on BBB:`, error);
    return false;
  }
};

/**
 * Update attendance records when meeting ends
 */
const updateAttendanceRecords = async (meetingId, endTime, meetingDuration = 60) => {
  try {
    const attendanceRecords = await Attendance.find({ 
      meetingId: meetingId,
      status: { $ne: 'instructor-joined' }
    });

    const updatedRecords = [];

    for (const record of attendanceRecords) {
      if (record.joinTime && !record.leaveTime) {
        record.leaveTime = endTime;
        record.duration = Math.round((endTime - record.joinTime) / (1000 * 60));

        const attendancePercentage = calculateAttendancePercentage(record.duration, meetingDuration);
        const newStatus = determineAttendanceStatus(attendancePercentage, record.status);
        
        if (newStatus === 'left-early') {
          record.status = newStatus;
          record.notes = createAttendanceNotes(record.notes, attendancePercentage);
        }

        await record.save();
        updatedRecords.push(record);
      }
    }

    return updatedRecords.length;

  } catch (error) {
    return 0;
  }
};

/**
 * End a meeting and update attendance (functional approach)
 */
const endMeeting = async (meeting) => {
  try {
    const endTime = new Date();

    // Update meeting status
    meeting.status = 'ended';
    meeting.actualEndTime = endTime;
    await meeting.save();

    // Update attendance records
    const updatedRecords = await updateAttendanceRecords(meeting.meetingID, endTime, meeting.duration);

    // Mark attendance as generated
    meeting.attendanceGenerated = true;
    meeting.attendanceGeneratedAt = endTime;
    await meeting.save();

    console.log(`✅ Meeting ended and attendance finalized: ${meeting.title} (${updatedRecords} records updated)`);
    
    return { success: true, updatedRecords };

  } catch (error) {
    console.error(`❌ Error ending meeting ${meeting.meetingID}:`, error);
    return { success: false, error };
  }
};

/**
 * Check a single meeting status (functional approach)
 */
const checkSingleMeeting = async (meeting) => {
  try {
    const isRunning = await checkMeetingOnBBB(meeting.meetingID);

    if (!isRunning) {
      console.log(`🏁 Meeting ended on BBB: ${meeting.title} (${meeting.meetingID})`);
      return await endMeeting(meeting);
    }

    return { success: true, status: 'running' };

  } catch (error) {
    console.error(`❌ Error checking meeting ${meeting.meetingID}:`, error);
    return { success: false, error };
  }
};

/**
 * Process multiple meetings
 */
const processMeetings = async (meetings) => {
  const results = await Promise.allSettled(
    meetings.map(meeting => checkSingleMeeting(meeting))
  );

  const successful = results.filter(result => 
    result.status === 'fulfilled' && result.value.success
  ).length;

  const failed = results.length - successful;

  return { successful, failed, total: results.length };
};

/**
 * Check all active meetings and update their status (functional approach)
 */
const checkActiveMeetings = async () => {
  try {
    const activeMeetings = await fetchActiveMeetings();

    if (activeMeetings.length === 0) {
      return { checked: 0, message: 'No active meetings to check' };
    }

    console.log(`🔍 Checking ${activeMeetings.length} active meetings...`);

    const results = await processMeetings(activeMeetings);

    console.log(`📊 Processed ${results.total} meetings: ${results.successful} successful, ${results.failed} failed`);

    return results;

  } catch (error) {
    console.error('❌ Error checking active meetings:', error);
    return { checked: 0, error };
  }
};

/**
 * Start the meeting status checker (functional approach)
 */
const start = () => {
  if (checkerState.isRunning) {
    console.log('📊 Meeting status checker is already running');
    return { success: false, reason: 'Already running' };
  }

  checkerState.isRunning = true;
  console.log('🚀 Starting meeting status checker...');
  
  // Start the periodic check
  checkerState.intervalId = setInterval(() => {
    checkActiveMeetings();
  }, checkerState.checkInterval);

  return { success: true };
};

/**
 * Stop the meeting status checker (functional approach)
 */
const stop = () => {
  if (checkerState.intervalId) {
    clearInterval(checkerState.intervalId);
    checkerState.intervalId = null;
  }
  checkerState.isRunning = false;
  console.log('⏹️ Meeting status checker stopped');
  
  return { success: true };
};

/**
 * Manual check for a specific meeting (functional approach)
 */
const checkMeetingStatus = async (meetingId) => {
  try {
    const meeting = await Meeting.findOne({ meetingID: meetingId });
    if (!meeting) {
      throw new Error('Meeting not found');
    }

    if (meeting.status !== 'active') {
      return { status: meeting.status, message: 'Meeting is not active' };
    }

    const isRunning = await checkMeetingOnBBB(meetingId);
    
    if (!isRunning) {
      const result = await endMeeting(meeting);
      return { 
        status: 'ended', 
        message: 'Meeting ended and attendance finalized',
        result 
      };
    }

    return { status: 'active', message: 'Meeting is still running' };

  } catch (error) {
    console.error(`❌ Error checking meeting ${meetingId}:`, error);
    throw error;
  }
};

/**
 * Get checker status and statistics
 */
const getStatus = () => ({
  isRunning: checkerState.isRunning,
  checkInterval: checkerState.checkInterval,
  hasInterval: checkerState.intervalId !== null
});

// Export functional interface
export {
  start,
  stop,
  checkActiveMeetings,
  checkSingleMeeting,
  checkMeetingStatus,
  endMeeting,
  updateAttendanceRecords,
  getStatus,
  // Utility functions
  calculateAttendancePercentage,
  determineAttendanceStatus,
  createAttendanceNotes,
  fetchActiveMeetings,
  checkMeetingOnBBB,
  processMeetings
};

// Default export for backward compatibility
export default {
  start,
  stop,
  checkActiveMeetings: () => checkActiveMeetings(),
  checkMeetingStatus,
  endMeeting,
  get isRunning() { return checkerState.isRunning; },
  get checkInterval() { return checkerState.checkInterval; }
};