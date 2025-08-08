import Meeting from '../models/Meeting.js';
import NotificationService from './notificationService.js';

class MeetingSchedulerNative {
  static scheduledReminders = new Map(); // Track scheduled timeouts
  
  /**
   * Initialize scheduler - check every 5 minutes for new meetings
   */
  static init() {
    console.log('📅 Native meeting scheduler initialized');
    
    // Check for new meetings every 5 minutes
    setInterval(async () => {
      await this.scheduleNewMeetingReminders();
    }, 5 * 60 * 1000); // 5 minutes
    
    // Initial check
    this.scheduleNewMeetingReminders();
    
    console.log('⏰ Native meeting reminder scheduler started');
  }
  
  /**
   * Find new scheduled meetings and set up their reminders
   */
  static async scheduleNewMeetingReminders() {
    try {
      const now = new Date();
      const futureTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Next 24 hours
      
      // Find scheduled meetings in next 24 hours that don't have reminders set
      const upcomingMeetings = await Meeting.find({
        status: 'scheduled',
        scheduledStartTime: {
          $gte: now,
          $lte: futureTime
        },
        reminderSent: false
      });
      
      for (const meeting of upcomingMeetings) {
        if (!this.scheduledReminders.has(meeting._id.toString())) {
          this.scheduleReminderForMeeting(meeting);
        }
      }
      
    } catch (error) {
      console.error('Error scheduling meeting reminders:', error);
    }
  }
  
  /**
   * Schedule a reminder for a specific meeting
   */
  static scheduleReminderForMeeting(meeting) {
    const now = new Date();
    
    const reminderTime = new Date(meeting.scheduledStartTime.getTime() - 30 * 60 * 1000); // 30 minutes before
      console.log({'meeting reminderTime:':reminderTime});
      
    if (reminderTime > now) {
      const delay = reminderTime.getTime() - now.getTime();
      
      const timeoutId = setTimeout(async () => {
        try {
          await this.sendMeetingReminder(meeting._id);
          this.scheduledReminders.delete(meeting._id.toString());
        } catch (error) {
          console.error(`Error sending reminder for meeting ${meeting._id}:`, error);
        }
      }, delay);
      
      this.scheduledReminders.set(meeting._id.toString(), timeoutId);
      console.log(`⏰ Reminder scheduled for meeting ${meeting._id} at ${reminderTime.toLocaleString()}`);
    }
  }
  
  /**
   * Send reminder notification
   */
  static async sendMeetingReminder(meetingId) {
    try {
      const meeting = await Meeting.findById(meetingId)
        .populate('lessonId', 'title')
        .populate('groupId', 'code')
        .populate('instructorId', 'firstName lastName');
        
      if (!meeting || meeting.status !== 'scheduled' || meeting.reminderSent) {
        return;
      }
      
      const instructorFullName = `${meeting.instructorId.firstName || ''} ${meeting.instructorId.lastName || ''}`.trim();
      
      const notificationResult = await NotificationService.createMeetingNotifications({
        lessonId: meeting.lessonId._id,
        lessonTitle: meeting.title,
        groupId: meeting.groupId._id,
        groupCode: meeting.groupId.code,
        instructorId: meeting.instructorId._id,
        instructorName: instructorFullName,
        meetingId: meeting.meetingID,
        duration: meeting.duration,
        type: 'meeting_reminder',
        scheduledTime: meeting.scheduledStartTime
      });
      
      // Mark reminder as sent
      meeting.reminderSent = true;
      await meeting.save();
      
      console.log(`✅ 30-minute reminder sent for meeting "${meeting.title}" to ${notificationResult.notificationsCreated} students`);
      
    } catch (error) {
      console.error(`❌ Failed to send reminder for meeting ${meetingId}:`, error);
    }
  }
  
  /**
   * Cancel reminder for a meeting
   */
  static cancelMeetingReminder(meetingId) {
    const timeoutId = this.scheduledReminders.get(meetingId.toString());
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.scheduledReminders.delete(meetingId.toString());
      console.log(`🚫 Reminder cancelled for meeting ${meetingId}`);
    }
  }
}

export default MeetingSchedulerNative;