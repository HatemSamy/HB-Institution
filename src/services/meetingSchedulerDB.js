import Meeting from '../models/Meeting.js';
import NotificationService from './notificationService.js';

const calculateReminderTimeRange = (now, minutesBefore = 3) => {
  const reminderTime = new Date(now.getTime() + minutesBefore * 60 * 1000);
  const reminderTimeEnd = new Date(now.getTime() + (minutesBefore + 1) * 60 * 1000);
  return { reminderTime, reminderTimeEnd };
};

const formatInstructorName = (instructor) => {
  return `${instructor.firstName || ''} ${instructor.lastName || ''}`.trim();
};

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

const fetchMeetingsNeedingReminders = async (timeRange) => {
  try {
    return await Meeting.find({
      status: 'scheduled',
      scheduledStartTime: {
        $gte: timeRange.reminderTime,
        $lt: timeRange.reminderTimeEnd
      },
      reminderSent: false
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

const processMeetingReminders = async (meetings) => {
  const results = await Promise.allSettled(
    meetings.map(meeting => sendMeetingReminder(meeting))
  );
  
  const successful = results.filter(result => 
    result.status === 'fulfilled' && result.value.success
  ).length;
  
  const failed = results.length - successful;
  
  return { successful, failed, total: results.length };
};

const checkAndSendReminders = async () => {
  try {
    const now = new Date();
    const timeRange = calculateReminderTimeRange(now, 3);
    const meetingsNeedingReminders = await fetchMeetingsNeedingReminders(timeRange);
    
    if (meetingsNeedingReminders.length === 0) {
      return 0;
    }
    
    const results = await processMeetingReminders(meetingsNeedingReminders);
    return results.successful;
    
  } catch (error) {
    return 0;
  }
};

const checkOverdueMeetings = async () => {
  try {
    const now = new Date();
    
    const overdueMeetings = await Meeting.find({
      status: 'scheduled',
      scheduledStartTime: { $lt: now }
    });
    
    for (const meeting of overdueMeetings) {
      meeting.status = 'active';
      meeting.actualStartTime = meeting.scheduledStartTime;
      await meeting.save();
    }
    
    return overdueMeetings.length;
    
  } catch (error) {
    return 0;
  }
};

export {
  checkAndSendReminders,
  sendMeetingReminder,
  checkOverdueMeetings,
  calculateReminderTimeRange,
  formatInstructorName,
  createNotificationData,
  fetchMeetingsNeedingReminders,
  processMeetingReminders
};

export default {
  checkAndSendReminders,
  sendMeetingReminder: (meeting) => sendMeetingReminder(meeting),
  checkOverdueMeetings
};