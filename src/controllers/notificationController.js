import { asynchandler, AppError } from "../middleware/erroeHandling.js";
import { paginate } from "../middleware/pagination.js";
import NotificationService from "../services/notificationService.js";
import Notification from "../models/Notification.js";

export const getUserNotifications = asynchandler(async (req, res, next) => {
  const userId = req.user._id;
  const page = parseInt(req.query.page) || 1;
  const size = parseInt(req.query.size) || 20;
  const {
    status,
    type,
    includeExpired = false
  } = req.query;

  // Use pagination middleware
  const { skip, limit } = paginate(page, size);

  const options = {
    status: status ? status.split(',') : ['unread', 'read'],
    type,
    limit,
    skip,
    includeExpired: includeExpired === 'true'
  };

  const result = await NotificationService.getUserNotifications(userId, options);

  // Get total count for pagination
  let query = {
    recipientId: userId,
    status: { $in: options.status }
  };

  if (options.type) {
    query.type = options.type;
  }

  if (!options.includeExpired) {
    query.$or = [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ];
  }

  const total = await Notification.countDocuments(query);

  // Clean up notifications to keep only essential information
  const cleanedNotifications = result.notifications.map(notification => ({
    id: notification._id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    status: notification.status,
    priority: notification.priority,
    createdAt: notification.createdAt,
    expiresAt: notification.expiresAt,
    // Essential related data only
    relatedData: {
      lessonId: notification.relatedData?.lessonId?._id || null,
      lessonTitle: notification.relatedData?.lessonId?.title || notification.relatedData?.metadata?.lessonTitle || null,
      groupId: notification.relatedData?.groupId?._id || null,
      groupCode: notification.relatedData?.groupId?.code || notification.relatedData?.metadata?.groupCode || null,
      meetingId: notification.relatedData?.meetingId || null,
      joinURL: notification.relatedData?.joinURL || null
    },
    // Essential sender info only
    sender: notification.senderId ? {
      id: notification.senderId._id,
      name: `${notification.senderId.firstName} ${notification.senderId.lastName}`
    } : null,
    // Essential actions only
    actions: notification.actions?.map(action => ({
      label: action.label,
      type: action.type,
      url: action.url
    })) || []
  }));

  res.status(200).json({
    success: true,
    message: 'Notifications retrieved successfully',
    data: {
      notifications: cleanedNotifications,
      unreadCount: result.unreadCount,
      pagination: {
        currentPage: page,
        totalItems: total,
        totalPages: Math.ceil(total / size),
        hasNextPage: page < Math.ceil(total / size),
        hasPrevPage: page > 1
      }
    }
  });
});


export const getMeetingNotifications = asynchandler(async (req, res, next) => {
  const userId = req.user._id;
  const page = parseInt(req.query.page) || 1;
  const size = parseInt(req.query.size) || 20;
  const { lessonId, groupId } = req.query;
  
  // Use pagination middleware
  const { skip, limit } = paginate(page, size);
  
  let query = {
    recipientId: userId,
    type: { $in: ['meeting_created', 'meeting_started', 'meeting_reminder'] },
    status: { $in: ['unread', 'read'] },
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  };

  // Filter by lesson or group if provided
  if (lessonId) {
    query['relatedData.lessonId'] = lessonId;
  }
  if (groupId) {
    query['relatedData.groupId'] = groupId;
  }

  const [notifications, total] = await Promise.all([
    Notification.find(query)
      .populate('senderId', 'firstName lastName')
      .populate('relatedData.lessonId', 'title')
      .populate('relatedData.groupId', 'code')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Notification.countDocuments(query)
  ]);

  // Clean up meeting notifications
  const cleanedNotifications = notifications.map(notification => ({
    id: notification._id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    status: notification.status,
    priority: notification.priority,
    createdAt: notification.createdAt,
    expiresAt: notification.expiresAt,
    relatedData: {
      lessonId: notification.relatedData?.lessonId?._id || null,
      lessonTitle: notification.relatedData?.lessonId?.title || notification.relatedData?.metadata?.lessonTitle || null,
      groupId: notification.relatedData?.groupId?._id || null,
      groupCode: notification.relatedData?.groupId?.code || notification.relatedData?.metadata?.groupCode || null,
      meetingId: notification.relatedData?.meetingId || null,
      joinURL: notification.relatedData?.joinURL || null
    },
    sender: notification.senderId ? {
      id: notification.senderId._id,
      name: `${notification.senderId.firstName} ${notification.senderId.lastName}`
    } : null,
    actions: notification.actions?.map(action => ({
      label: action.label,
      type: action.type,
      url: action.url
    })) || []
  }));

  res.status(200).json({
    success: true,
    message: 'Meeting notifications retrieved successfully',
    data: {
      notifications: cleanedNotifications,
      pagination: {
        currentPage: page,
        totalItems: total,
        totalPages: Math.ceil(total / size),
        hasNextPage: page < Math.ceil(total / size),
        hasPrevPage: page > 1
      }
    }
  });
});

export const deleteNotification = asynchandler(async (req, res, next) => {
  const { notificationId } = req.params;
  const userId = req.user._id;

  const result = await NotificationService.deleteNotification(notificationId, userId);

  res.status(200).json({
    success: true,
    message: 'Notification deleted successfully',
    data: {
      deletedNotification: result.deletedNotification
    }
  });
});

export const deleteAllNotifications = asynchandler(async (req, res, next) => {
  const userId = req.user._id;

  const result = await NotificationService.deleteAllNotifications(userId);

  res.status(200).json({
    success: true,
    message: `Deleted ${result.deletedCount} notifications successfully`,
    data: {
      deletedCount: result.deletedCount
    }
  });
});

export const testMeetingReminder = asynchandler(async (req, res, next) => {
  const { meetingId } = req.params;
  const instructorId = req.user._id;

  const result = await NotificationService.sendMeetingReminders(meetingId, instructorId);

  res.status(200).json({
    success: true,
    message: 'Test meeting reminders sent successfully (Vercel testing)',
    data: {
      notificationsSent: result.notifications?.length || 0,
      meetingId: meetingId,
      platform: 'Vercel (Polling mode)'
    }
  });
});

