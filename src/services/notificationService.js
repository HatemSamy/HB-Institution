import Notification from '../models/Notification.js';
import ClassSelectionModel from '../models/ClassSelection.js';
import Lesson from '../models/Lesson.js';
import Meeting from '../models/Meeting.js';
import Group from '../models/Group.js';
import bigBlueButtonService from './bigBlueButtonService.js';

class NotificationService {
  
  /**
   * Create meeting notifications for all students in a group
   */
  static async createMeetingNotifications(meetingData) {
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
            priority: this.getNotificationPriority(type),
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
  }

  /**
   * Get notification priority based on type
   */
  static getNotificationPriority(type) {
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
  }

  /**
   * Get notifications for a specific user
   */
  static async getUserNotifications(userId, options = {}) {
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
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOne({
        _id: notificationId,
        recipientId: userId
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      await notification.markAsRead();
      
      return {
        success: true,
        notification
      };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark multiple notifications as read
   */
  static async markMultipleAsRead(notificationIds, userId) {
    try {
      const result = await Notification.markMultipleAsRead(userId, notificationIds);
      
      return {
        success: true,
        modifiedCount: result.modifiedCount
      };
    } catch (error) {
      console.error('Error marking multiple notifications as read:', error);
      throw error;
    }
  }

  /**
   * Archive notification
   */
  static async archiveNotification(notificationId, userId) {
    try {
      const notification = await Notification.findOne({
        _id: notificationId,
        recipientId: userId
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      await notification.archive();
      
      return {
        success: true,
        notification
      };
    } catch (error) {
      console.error('Error archiving notification:', error);
      throw error;
    }
  }

  /**
   * Get notification statistics for a user
   */
  static async getNotificationStats(userId) {
    try {
      const stats = await Notification.aggregate([
        {
          $match: {
            recipientId: userId,
            $or: [
              { expiresAt: { $exists: false } },
              { expiresAt: { $gt: new Date() } }
            ]
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const typeStats = await Notification.aggregate([
        {
          $match: {
            recipientId: userId,
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
          }
        },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 }
          }
        }
      ]);

      const statusCounts = stats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, { unread: 0, read: 0, archived: 0 });

      const typeCounts = typeStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {});

      return {
        success: true,
        stats: {
          byStatus: statusCounts,
          byType: typeCounts,
          total: Object.values(statusCounts).reduce((sum, count) => sum + count, 0)
        }
      };
    } catch (error) {
      console.error('Error getting notification stats:', error);
      throw error;
    }
  }

  /**
   * Clean up expired notifications
   */
  static async cleanupExpiredNotifications() {
    try {
      const result = await Notification.deleteMany({
        expiresAt: { $lt: new Date() },
        status: { $in: ['read', 'archived'] }
      });

      console.log(`🧹 Cleaned up ${result.deletedCount} expired notifications`);
      
      return {
        success: true,
        deletedCount: result.deletedCount
      };
    } catch (error) {
      console.error('Error cleaning up expired notifications:', error);
      throw error;
    }
  }

  /**
   * Send reminder notifications for active meetings
   */
  static async sendMeetingReminders(meetingId, instructorId) {
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

      const result = await this.createMeetingNotifications({
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

      return result;
    } catch (error) {
      console.error('Error sending meeting reminders:', error);
      throw error;
    }
  }
}

export default NotificationService;