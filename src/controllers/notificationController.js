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

export const getNotificationStats = asynchandler(async (req, res, next) => {
  const userId = req.user._id;

  const result = await NotificationService.getNotificationStats(userId);

  res.status(200).json({
    success: true,
    message: 'Notification statistics retrieved successfully',
    data: result.stats
  });
});

export const markNotificationAsRead = asynchandler(async (req, res, next) => {
  const { notificationId } = req.params;
  const userId = req.user._id;

  const result = await NotificationService.markAsRead(notificationId, userId);

  res.status(200).json({
    success: true,
    message: 'Notification marked as read',
    data: result.notification
  });
});

export const markMultipleAsRead = asynchandler(async (req, res, next) => {
  const { notificationIds } = req.body;
  const userId = req.user._id;

  if (!notificationIds || !Array.isArray(notificationIds)) {
    throw new AppError('Please provide an array of notification IDs', 400);
  }

  const result = await NotificationService.markMultipleAsRead(notificationIds, userId);

  res.status(200).json({
    success: true,
    message: `${result.modifiedCount} notifications marked as read`,
    data: {
      modifiedCount: result.modifiedCount
    }
  });
});

export const markAllAsRead = asynchandler(async (req, res, next) => {
  const userId = req.user._id;

  const result = await Notification.updateMany(
    {
      recipientId: userId,
      status: 'unread'
    },
    {
      status: 'read',
      readAt: new Date()
    }
  );

  res.status(200).json({
    success: true,
    message: `${result.modifiedCount} notifications marked as read`,
    data: {
      modifiedCount: result.modifiedCount
    }
  });
});

export const archiveNotification = asynchandler(async (req, res, next) => {
  const { notificationId } = req.params;
  const userId = req.user._id;

  const result = await NotificationService.archiveNotification(notificationId, userId);

  res.status(200).json({
    success: true,
    message: 'Notification archived',
    data: result.notification
  });
});

export const deleteNotification = asynchandler(async (req, res, next) => {
  const { notificationId } = req.params;
  const userId = req.user._id;

  const notification = await Notification.findOne({
    _id: notificationId,
    recipientId: userId
  });

  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  await Notification.findByIdAndDelete(notificationId);

  res.status(200).json({
    success: true,
    message: 'Notification deleted successfully'
  });
});

export const getUnreadCount = asynchandler(async (req, res, next) => {
  const userId = req.user._id;

  const unreadCount = await Notification.countDocuments({
    recipientId: userId,
    status: 'unread',
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  });

  res.status(200).json({
    success: true,
    data: {
      unreadCount
    }
  });
});

export const getNotificationsByType = asynchandler(async (req, res, next) => {
  const { type } = req.params;
  const userId = req.user._id;
  const page = parseInt(req.query.page) || 1;
  const size = parseInt(req.query.size) || 20;
  const {
    status = 'unread,read'
  } = req.query;

  const validTypes = [
    'meeting_created',
    'meeting_started', 
    'meeting_reminder',
    'meeting_ended',
    'lesson_unlocked',
    'assignment_due',
    'course_update',
    'system_announcement'
  ];

  if (!validTypes.includes(type)) {
    throw new AppError('Invalid notification type', 400);
  }

  // Use pagination middleware
  const { skip, limit } = paginate(page, size);

  const options = {
    status: status.split(','),
    type,
    limit,
    skip,
    includeExpired: false
  };

  const result = await NotificationService.getUserNotifications(userId, options);

  // Get total count for this type
  const total = await Notification.countDocuments({
    recipientId: userId,
    type,
    status: { $in: options.status },
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  });

  // Clean up notifications for type-specific endpoint too
  const cleanedNotifications = result.notifications.map(notification => ({
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
    message: `${type} notifications retrieved successfully`,
    data: {
      notifications: cleanedNotifications,
      type,
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

export const cleanupExpiredNotifications = asynchandler(async (req, res, next) => {
  if (req.user.role !== 'admin') {
    throw new AppError('Only administrators can perform this action', 403);
  }

  const result = await NotificationService.cleanupExpiredNotifications();

  res.status(200).json({
    success: true,
    message: `Cleaned up ${result.deletedCount} expired notifications`,
    data: {
      deletedCount: result.deletedCount
    }
  });
});