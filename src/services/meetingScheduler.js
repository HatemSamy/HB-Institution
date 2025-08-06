import cron from 'node-cron';
import Meeting from '../models/Meeting.js';
import NotificationService from './notificationService.js';

// State management for scheduled reminders
const schedulerState = {
  scheduledReminders: new Map(),
  isInitialized: false
};

// Pure function to calculate reminder time - UPDATED to 3 minutes
const calculateReminderTime = (scheduledStartTime, minutesBefore = 3) => {
  return new Date(scheduledStartTime.getTime() - minutesBefore * 60 * 1000);
};

// FIXED: Simple and direct time range calculation
const calculateTimeRange = (now) => {
  // Look for meetings that should get reminders RIGHT NOW
  // Meeting time should be exactly 3 minutes from now (±30 seconds window)
  const exactReminderTime = new Date(now.getTime() + 3 * 60 * 1000); // Exactly 3 minutes from now
  const reminderTimeStart = new Date(exactReminderTime.getTime() - 30 * 1000); // 30 seconds before
  const reminderTimeEnd = new Date(exactReminderTime.getTime() + 30 * 1000); // 30 seconds after
  
  return { 
    reminderTimeStart, 
    reminderTimeEnd,
    exactReminderTime 
  };
};

// Pure function to format instructor name
const formatInstructorName = (instructor) => {
  return `${instructor.firstName || ''} ${instructor.lastName || ''}`.trim();
};

// Pure function to create meeting notification data
const createNotificationData = (meeting) => ({
  lessonId: meeting.lessonId._id,
  lessonTitle: meeting.title,
  groupId: meeting.groupId._id,
  groupCode: meeting.groupId.code,
  instructorId: meeting.instructorId._id,
  instructorName: formatInstructorName(meeting.instructorId),
  meetingId: meeting.meetingID,
  duration: meeting.duration,
  type: 'meeting_reminder',
  scheduledTime: meeting.scheduledStartTime
});

// FIXED: Simple and direct meeting lookup
const fetchUpcomingMeetings = async (timeRange) => {
  try {
    return await Meeting.find({
      status: 'scheduled',
      scheduledStartTime: {
        $gte: timeRange.reminderTimeStart,
        $lte: timeRange.reminderTimeEnd
      },
      reminderSent: { $ne: true }
    })
    .populate('lessonId', 'title')
    .populate('groupId', 'code')
    .populate('instructorId', 'firstName lastName');
  } catch (error) {
    return [];
  }
};

const sendMeetingReminder = async (meeting) => {
  try {
    const notificationData = createNotificationData(meeting);
    const notificationResult = await NotificationService.createMeetingNotifications(notificationData);
    
    meeting.reminderSent = true;
    await meeting.save();
    
    return { success: true, notificationResult };
  } catch (error) {
    return { success: false, error };
  }
};

// Function to process multiple meetings
const processMeetingReminders = async (meetings) => {
  const results = await Promise.allSettled(
    meetings.map(meeting => sendMeetingReminder(meeting))
  );
  
  const successful = results.filter(result => result.status === 'fulfilled' && result.value.success).length;
  const failed = results.length - successful;
  
  return { successful, failed, total: results.length };
};

const checkUpcomingMeetings = async () => {
  try {
    const now = new Date();
    const timeRange = calculateTimeRange(now);
    const upcomingMeetings = await fetchUpcomingMeetings(timeRange);
    
    if (upcomingMeetings.length > 0) {
      const results = await processMeetingReminders(upcomingMeetings);
      return results;
    }
    return { successful: 0, failed: 0, total: 0 };
  } catch (error) {
    return { successful: 0, failed: 0, total: 0 };
  }
};

// Function to fetch meeting by ID with population
const fetchMeetingById = async (meetingId) => {
  try {
    return await Meeting.findById(meetingId)
      .populate('lessonId', 'title')
      .populate('groupId', 'code')
      .populate('instructorId', 'firstName lastName');
  } catch (error) {
    console.error(`Error fetching meeting ${meetingId}:`, error);
    return null;
  }
};

// Function to validate meeting for reminder
const isMeetingValidForReminder = (meeting) => {
  return meeting && 
         meeting.status === 'scheduled' && 
         !meeting.reminderSent;
};

// Function to schedule a specific meeting reminder using setTimeout
const scheduleMeetingReminder = async (meetingId) => {
  try {
    const meeting = await Meeting.findById(meetingId);
    if (!meeting || meeting.status !== 'scheduled') {
      return { success: false, reason: 'Meeting not found or not scheduled' };
    }
    
    const now = new Date();
    const reminderTime = calculateReminderTime(meeting.scheduledStartTime);
    
    if (reminderTime <= now) {
      return { success: false, reason: 'Reminder time has passed' };
    }
    
    const delay = reminderTime.getTime() - now.getTime();
    
    const timeoutId = setTimeout(async () => {
      try {
        const currentMeeting = await fetchMeetingById(meetingId);
        if (isMeetingValidForReminder(currentMeeting)) {
          await sendMeetingReminder(currentMeeting);
        }
        schedulerState.scheduledReminders.delete(meetingId.toString());
      } catch (error) {
        console.error(`Error sending scheduled reminder for meeting ${meetingId}:`, error);
      }
    }, delay);
    
    schedulerState.scheduledReminders.set(meetingId.toString(), timeoutId);
    console.log(`⏰ Reminder scheduled for meeting ${meetingId} at ${reminderTime.toLocaleString()}`);
    
    return { success: true, reminderTime, delay };
  } catch (error) {
    console.error(`Error scheduling reminder for meeting ${meetingId}:`, error);
    return { success: false, error: error.message };
  }
};

// Function to cancel a scheduled meeting reminder
const cancelMeetingReminder = async (meetingId) => {
  try {
    const timeoutId = schedulerState.scheduledReminders.get(meetingId.toString());
    
    if (timeoutId) {
      clearTimeout(timeoutId);
      schedulerState.scheduledReminders.delete(meetingId.toString());
      console.log(`🚫 Scheduled reminder cancelled for meeting ${meetingId}`);
    }
    
    // Also mark reminder as sent in database to prevent cron job from sending it
    await Meeting.findByIdAndUpdate(meetingId, { reminderSent: true });
    console.log(`🚫 Database reminder cancelled for meeting ${meetingId}`);
    
    return { success: true };
  } catch (error) {
    console.error(`Error cancelling reminder for meeting ${meetingId}:`, error);
    return { success: false, error: error.message };
  }
};

// Function to get scheduler statistics
const getSchedulerStats = () => ({
  isInitialized: schedulerState.isInitialized,
  scheduledRemindersCount: schedulerState.scheduledReminders.size,
  scheduledMeetingIds: Array.from(schedulerState.scheduledReminders.keys())
});

// Function to clear all scheduled reminders
const clearAllScheduledReminders = () => {
  schedulerState.scheduledReminders.forEach((timeoutId) => {
    clearTimeout(timeoutId);
  });
  schedulerState.scheduledReminders.clear();
  console.log('🧹 All scheduled reminders cleared');
};

// Main initialization function - ENHANCED
const init = () => {
  if (schedulerState.isInitialized) {
    console.log('⚠️ Meeting scheduler already initialized');
    return { success: false, reason: 'Already initialized' };
  }
  
  console.log('📅 Functional meeting scheduler initialized');
  
  // Schedule cron job to check for upcoming meetings every minute
  cron.schedule('* * * * *', () => {
    console.log('🔄 Cron job triggered - checking meetings...');
    checkUpcomingMeetings();
  });
  
  schedulerState.isInitialized = true;
  console.log('⏰ Meeting reminder scheduler started - checking every minute');
  
  // Run initial check
  setTimeout(() => {
    console.log('🚀 Running initial scheduler check...');
    checkUpcomingMeetings();
  }, 5000); // Wait 5 seconds after startup
  
  return { success: true };
};

// Function to shutdown scheduler gracefully
const shutdownScheduler = () => {
  clearAllScheduledReminders();
  schedulerState.isInitialized = false;
  console.log('🛑 Meeting scheduler shutdown');
};

// Export functions for backward compatibility with class-based approach
export default {
  init,
  checkUpcomingMeetings,
  sendMeetingReminder,
  scheduleMeetingReminder,
  cancelMeetingReminder,
  getSchedulerStats,
  clearAllScheduledReminders,
  shutdownScheduler
};

// Named exports for functional approach
export {
  init,
  checkUpcomingMeetings,
  sendMeetingReminder,
  scheduleMeetingReminder,
  cancelMeetingReminder,
  getSchedulerStats,
  clearAllScheduledReminders,
  shutdownScheduler,
  // Utility functions
  calculateReminderTime,
  calculateTimeRange,
  formatInstructorName,
  createNotificationData,
  fetchUpcomingMeetings,
  processMeetingReminders
};