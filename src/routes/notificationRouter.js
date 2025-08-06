import express from 'express';
import * as notificationController from '../controllers/notificationController.js';
import { authorize, protect } from '../middleware/auth.js';
import { AccessRoles } from '../utils/helpers.js';

const router = express.Router();

// Get all notifications for authenticated user
router.get(
  '/',
  protect,
  authorize(AccessRoles.general),
  notificationController.getUserNotifications
);

// Get notification statistics
router.get(
  '/stats',
  protect,
  authorize(AccessRoles.general),
  notificationController.getNotificationStats
);

// Get unread notification count
router.get(
  '/unread-count',
  protect,
  authorize(AccessRoles.general),
  notificationController.getUnreadCount
);

// Get notifications by type
router.get(
  '/type/:type',
  protect,
  authorize(AccessRoles.general),
  notificationController.getNotificationsByType
);

// Get meeting-related notifications (for calendar/lesson details)
router.get(
  '/meetings',
  protect,
  authorize(AccessRoles.general),
  notificationController.getMeetingNotifications
);

// Mark notification as read
router.patch(
  '/:notificationId/read',
  protect,
  authorize(AccessRoles.general),
  notificationController.markNotificationAsRead
);

// Mark multiple notifications as read
router.patch(
  '/mark-multiple-read',
  protect,
  authorize(AccessRoles.general),
  notificationController.markMultipleAsRead
);

// Mark all notifications as read
router.patch(
  '/mark-all-read',
  protect,
  authorize(AccessRoles.general),
  notificationController.markAllAsRead
);

// Archive notification
router.patch(
  '/:notificationId/archive',
  protect,
  authorize(AccessRoles.general),
  notificationController.archiveNotification
);

// Delete notification
router.delete(
  '/:notificationId',
  protect,
  authorize(AccessRoles.general),
  notificationController.deleteNotification
);

// Clean up expired notifications (admin only)
router.delete(
  '/cleanup/expired',
  protect,
  authorize(AccessRoles.admin),
  notificationController.cleanupExpiredNotifications
);

export default router;