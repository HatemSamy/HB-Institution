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


// Get meeting-related notifications (for calendar/lesson details)
router.get(
  '/meetings',
  protect,
  authorize(AccessRoles.general),
  notificationController.getMeetingNotifications
);

// TODO: Test endpoint for Socket.IO - send meeting reminders manually
// router.post(
//   '/test-reminder/:meetingId',
//   protect,
//   authorize(AccessRoles.instructor),
//   notificationController.testMeetingReminder
// );

// Delete all notifications for user
router.delete(
  '/all',
  protect,
  authorize(AccessRoles.general),
  notificationController.deleteAllNotifications
);

// Delete single notification (user can delete their own)
router.delete(
  '/:notificationId',
  protect,
  authorize(AccessRoles.general),
  notificationController.deleteNotification
);


export default router;