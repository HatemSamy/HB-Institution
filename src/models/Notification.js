import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  // Who receives the notification
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Who sent/triggered the notification
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Type of notification
  type: {
    type: String,
    enum: [
      'meeting_created',
      'meeting_scheduled',
      'meeting_started', 
      'meeting_reminder',
      'meeting_ended',
      'lesson_unlocked',
      'assignment_due',
      'course_update',
      'system_announcement'
    ],
    required: true
  },
  
  // Notification title
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  
  // Notification message/content
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  
  // Related entities
  relatedData: {
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson'
    },
    meetingId: {
      type: String // BBB meeting ID
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group'
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    },
    joinURL: {
      type: String
    },
    // Any additional data specific to notification type
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  
  // Notification status
  status: {
    type: String,
    enum: ['unread', 'read', 'archived'],
    default: 'unread'
  },
  
  // Priority level
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // When to show the notification (for scheduled notifications)
  scheduledFor: {
    type: Date,
    default: Date.now
  },
  
  // When the notification was read
  readAt: {
    type: Date
  },
  
  // Expiration date (optional)
  expiresAt: {
    type: Date
  },
  
  // Action buttons/links
  actions: [{
    label: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['link', 'button', 'api_call'],
      default: 'link'
    },
    url: {
      type: String
    },
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'DELETE'],
      default: 'GET'
    }
  }]
}, {
  timestamps: true
});

// Indexes for better performance
notificationSchema.index({ recipientId: 1, status: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ scheduledFor: 1 });
notificationSchema.index({ expiresAt: 1 });

// Virtual for checking if notification is expired
notificationSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.status = 'read';
  this.readAt = new Date();
  return this.save();
};

// Method to mark as archived
notificationSchema.methods.archive = function() {
  this.status = 'archived';
  return this.save();
};

// Static method to create meeting notification
notificationSchema.statics.createMeetingNotification = async function(data) {
  const {
    recipientId,
    senderId,
    type,
    lessonTitle,
    groupCode,
    instructorName,
    meetingId,
    joinURL,
    lessonId,
    groupId,
    duration,
    priority = 'high',
    scheduledTime = null
  } = data;

  let title, message, actions = [];
  
  switch (type) {
    case 'meeting_created':
      title = `📚 Live Lesson Started: ${lessonTitle}`;
      message = `${instructorName} has started a live lesson for ${lessonTitle} (Group: ${groupCode}). Join now to participate!`;
      actions = [{
        label: 'Join Meeting',
        type: 'link',
        url: joinURL,
        method: 'GET'
      }];
      break;
      
    case 'meeting_scheduled':
      title = `📅 Meeting Scheduled: ${lessonTitle}`;
      message = `${instructorName} has scheduled a live lesson for ${lessonTitle} (Group: ${groupCode}) at ${scheduledTime ? new Date(scheduledTime).toLocaleString() : 'scheduled time'}.`;
      actions = [{
        label: 'View Details',
        type: 'link',
        url: `/lessons/${lessonId}`,
        method: 'GET'
      }];
      break;
      
    case 'meeting_reminder':
      title = `⏰ Meeting Reminder: ${lessonTitle}`;
      message = `Reminder: Your live lesson "${lessonTitle}" with ${instructorName} starts in 30 minutes. Be ready to join!`;
      actions = [{
        label: 'Join Meeting',
        type: 'link',
        url: joinURL,
        method: 'GET'
      }];
      break;
      
    case 'meeting_started':
      title = `🟢 Live Now: ${lessonTitle}`;
      message = `Your scheduled lesson "${lessonTitle}" is now live! Click to join the session with ${instructorName}.`;
      actions = [{
        label: 'Join Meeting',
        type: 'link',
        url: joinURL,
        method: 'GET'
      }];
      break;
      
    default:
      title = `Meeting Update: ${lessonTitle}`;
      message = `There's an update for your lesson "${lessonTitle}" in group ${groupCode}.`;
  }

  // Set expiration based on notification type
  let expiresAt;
  if (type === 'meeting_scheduled') {
    // Scheduled notifications expire when meeting starts
    expiresAt = scheduledTime ? new Date(scheduledTime) : new Date(Date.now() + 24 * 60 * 60 * 1000);
  } else if (type === 'meeting_reminder') {
    // Reminder notifications expire 1 hour after meeting starts
    expiresAt = new Date(Date.now() + ((duration || 120) + 60) * 60 * 1000);
  } else {
    // Other meeting notifications expire after meeting duration + 30 minutes
    expiresAt = new Date(Date.now() + ((duration || 120) + 30) * 60 * 1000);
  }

  const notification = new this({
    recipientId,
    senderId,
    type,
    title,
    message,
    relatedData: {
      lessonId,
      meetingId,
      groupId,
      joinURL,
      metadata: {
        lessonTitle,
        groupCode,
        instructorName,
        duration,
        scheduledTime
      }
    },
    priority,
    actions,
    expiresAt
  });

  const savedNotification = await notification.save();

  // TODO: Emit real-time notification via Socket.IO only for meeting reminders
  // if (type === 'meeting_reminder') {
  //   try {
  //     // Import socketService dynamically to avoid circular dependency
  //     const { default: socketService } = await import('../services/socketService.js');
  //
  //     // Populate sender information for the socket emission
  //     await savedNotification.populate('senderId', 'firstName lastName');
  //
  //     // Send real-time meeting reminder to the user
  //     socketService.sendMeetingReminder(recipientId, {
  //       meetingId,
  //       lessonTitle,
  //       instructorName,
  //       groupCode,
  //       joinURL,
  //       scheduledTime,
  //       message: savedNotification.message
  //     });
  //
  //     console.log(`⏰ Real-time meeting reminder sent to user ${recipientId}`);
  //   } catch (error) {
  //     console.error('Failed to send real-time meeting reminder:', error);
  //     // Don't throw error - notification was saved successfully
  //   }
  // }

  return savedNotification;
};

// Static method to get user notifications
notificationSchema.statics.getUserNotifications = async function(userId, options = {}) {
  const {
    status = ['unread', 'read'],
    limit = 50,
    skip = 0,
    type,
    includeExpired = false
  } = options;

  const query = {
    recipientId: userId,
    status: { $in: Array.isArray(status) ? status : [status] }
  };

  if (type) {
    query.type = type;
  }

  if (!includeExpired) {
    query.$or = [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ];
  }

  return await this.find(query)
    .populate('senderId', 'firstName lastName')
    .populate('relatedData.lessonId', 'title')
    .populate('relatedData.groupId', 'code')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to mark multiple notifications as read
notificationSchema.statics.markMultipleAsRead = async function(userId, notificationIds) {
  return await this.updateMany(
    {
      _id: { $in: notificationIds },
      recipientId: userId
    },
    {
      status: 'read',
      readAt: new Date()
    }
  );
};

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;