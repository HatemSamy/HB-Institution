import Notification from '../models/Notification.js';
import ClassSelectionModel from '../models/ClassSelection.js';
import Lesson from '../models/Lesson.js';
import Meeting from '../models/Meeting.js';
import Group from '../models/Group.js';
import bigBlueButtonService from './bigBlueButtonService.js';
// import socketService from './socketService.js';

/**
 * Create meeting notifications for all students in a group
 */
export const createMeetingNotifications = async (meetingData) => {
    const {
      lessonId,
      lessonTitle,
      groupId,
      groupCode,
      instructorId,
      instructorName,
      meetingId,
      duration,
      type = 'meeting_created',
      scheduledTime = null
    } = meetingData;

    try {
      // Get all students enrolled in this group
      const enrolledStudents = await ClassSelectionModel.find({
        groupId: groupId,
        status: 'confirmed'
      }).populate('studentId', 'firstName lastName email');

      // Remove duplicates by studentId to avoid duplicate notifications
      const uniqueStudents = [];
      const seenStudentIds = new Set();
      
      for (const enrollment of enrolledStudents) {
        const studentId = enrollment.studentId._id.toString();
        if (!seenStudentIds.has(studentId)) {
          seenStudentIds.add(studentId);
          uniqueStudents.push(enrollment);
        }
      }

      console.log(`📢 Creating ${type} notifications for ${uniqueStudents.length} unique students (${enrolledStudents.length} total enrollments found)`);

      const notifications = [];
      const notificationPromises = [];

      for (const enrollment of uniqueStudents) {
        const student = enrollment.studentId;
        const studentFullName = `${student.firstName || ''} ${student.lastName || ''}`.trim();
        
        if (studentFullName) {
          let joinURL = null;
          
          // Only generate join URL for active meetings or reminders
          if (type === 'meeting_created' || type === 'meeting_started' || type === 'meeting_reminder') {
            joinURL = bigBlueButtonService.generateJoinURL({
              meetingID: meetingId,
              fullName: studentFullName,
              role: 'student',
              userID: student._id.toString()
            });
          }

          // Create notification data based on type
          const notificationData = {
            recipientId: student._id,
            senderId: instructorId,
            type,
            lessonTitle,
            groupCode,
            instructorName,
            meetingId,
            joinURL,
            lessonId,
            groupId,
            duration,
            priority: getNotificationPriority(type),
            scheduledTime
          };

          // Create notification for this student
          const notificationPromise = Notification.createMeetingNotification(notificationData);

          notificationPromises.push(notificationPromise);
          
          notifications.push({
            studentId: student._id,
            studentName: studentFullName,
            email: student.email,
            joinURL
          });
        } else {
          console.warn(`⚠️ Skipping student ${student._id} - incomplete name`);
        }
      }

      // Create all notifications concurrently
      const createdNotifications = await Promise.allSettled(notificationPromises);
      const successfulNotifications = createdNotifications.filter(result => 
        result.status === 'fulfilled'
      ).length;
      const failedNotifications = createdNotifications.length - successfulNotifications;

      console.log(`📊 Notification creation results: ${successfulNotifications} successful, ${failedNotifications} failed`);

      return {
        success: true,
        totalStudents: uniqueStudents.length,
        notificationsCreated: successfulNotifications,
        notificationsFailed: failedNotifications,
        students: notifications
      };

    } catch (error) {
      console.error('Error creating meeting notifications:', error);
      throw error;
    }
  };

/**
 * Get notification priority based on type
 */
export const getNotificationPriority = (type) => {
  switch (type) {
    case 'meeting_reminder':
      return 'urgent';
    case 'meeting_started':
      return 'urgent';
    case 'meeting_created':
      return 'high';
    case 'meeting_scheduled':
      return 'medium';
    default:
      return 'medium';
  }
};

/**
 * Get notifications for a specific user
 */
export const getUserNotifications = async (userId, options = {}) => {
  try {
    const notifications = await Notification.getUserNotifications(userId, options);
    
    // Count unread notifications
    const unreadCount = await Notification.countDocuments({
      recipientId: userId,
      status: 'unread',
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } }
      ]
    });

    return {
      success: true,
      notifications,
      unreadCount,
      total: notifications.length
    };
  } catch (error) {
    console.error('Error getting user notifications:', error);
    throw error;
  }
};

/**
 * Delete a single notification (user can delete their own)
 */
export const deleteNotification = async (notificationId, userId) => {
  try {
    const result = await Notification.findOneAndDelete({
      _id: notificationId,
      recipientId: userId
    });

    if (!result) {
      throw new Error('Notification not found');
    }

    console.log(`🗑️ Deleted notification ${notificationId} for user ${userId}`);
    
    return {
      success: true,
      deletedNotification: result
    };
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};

/**
 * Delete all notifications for a user
 */
export const deleteAllNotifications = async (userId) => {
  try {
    const result = await Notification.deleteMany({
      recipientId: userId
    });

    console.log(`🗑️ Deleted ${result.deletedCount} notifications for user ${userId}`);
    
    return {
      success: true,
      deletedCount: result.deletedCount
    };
  } catch (error) {
    console.error('Error deleting all notifications:', error);
    throw error;
  }
};


/**
 * Send reminder notifications for active meetings
 */
export const sendMeetingReminders = async (meetingId, instructorId) => {
  try {
    // Get meeting information
    const meeting = await Meeting.findById(meetingId)
      .populate('lessonId', 'title')
      .populate('groupId', 'code')
      .populate('instructorId', 'firstName lastName');
    
    if (!meeting) {
      throw new Error('Meeting not found');
    }

    const instructorFullName = `${meeting.instructorId.firstName || ''} ${meeting.instructorId.lastName || ''}`.trim();

    const result = await createMeetingNotifications({
      lessonId: meeting.lessonId._id,
      lessonTitle: meeting.title,
      groupId: meeting.groupId._id,
      groupCode: meeting.groupId.code,
      instructorId,
      instructorName: instructorFullName,
      meetingId: meeting.meetingID,
      duration: meeting.duration,
      type: 'meeting_reminder',
      scheduledTime: meeting.scheduledStartTime
    });

    // TODO: Send real-time Socket.IO events for meeting reminders
    // try {
    //   if (result.notifications && result.notifications.length > 0) {
    //     for (const notification of result.notifications) {
    //       socketService.sendMeetingReminder(notification.recipientId, {
    //         meetingId: meeting.meetingID,
    //         lessonTitle: meeting.title,
    //         instructorName: instructorFullName,
    //         groupCode: meeting.groupId.code,
    //         joinURL: notification.relatedData?.joinURL,
    //         scheduledTime: meeting.scheduledStartTime
    //       });
    //     }
    //     console.log(`⏰ Sent meeting reminder events to ${result.notifications.length} users`);
    //   }
    // } catch (error) {
    //   console.error('Failed to send real-time meeting reminders:', error);
    // }

    return result;
  } catch (error) {
    console.error('Error sending meeting reminders:', error);
    throw error;
  }
};

// Default export for backward compatibility
export default {
  createMeetingNotifications,
  getUserNotifications,
  deleteNotification,
  deleteAllNotifications,
  sendMeetingReminders,
  getNotificationPriority
};