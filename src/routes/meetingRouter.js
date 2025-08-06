import express from 'express';
import * as meetingController from '../controllers/meetingController.js';
import { endMeeting, updateLateThreshold, getAttendanceConfig } from '../controllers/meetingEndController.js';
import { checkMeetingStatus, forceEndMeeting, getStatusCheckerInfo } from '../controllers/meetingStatusController.js';
import { authorize, protect } from '../middleware/auth.js';
import { AccessRoles } from '../utils/helpers.js';
import { validateMeetingDates } from '../middleware/dateValidation.js';

const router = express.Router({ mergeParams: true });

// Create a meeting (immediate or scheduled) (Instructor only)
router.post(
  '/create',
  protect,
  authorize(AccessRoles.instructor),
  validateMeetingDates, // Add date validation middleware
  meetingController.createMeeting
);

// Get instructor's meetings
router.get(
  '/instructor/meetings',
  protect,
  authorize(AccessRoles.instructor),
  meetingController.getInstructorMeetings
);

// Manual end meeting (API endpoint)
router.patch(
  '/:meetingId/end',
  protect,
  authorize(AccessRoles.instructor),
  endMeeting
);

// Check if meeting has ended on BBB (manual check)
router.get(
  '/:meetingId/status',
  protect,
  authorize(AccessRoles.instructor),
  checkMeetingStatus
);

// Force end meeting (manual override)
router.patch(
  '/:meetingId/force-end',
  protect,
  authorize(AccessRoles.instructor),
  forceEndMeeting
);

// Get status checker info
router.get(
  '/status-checker/info',
  protect,
  authorize(AccessRoles.general),
  getStatusCheckerInfo
);

// Get attendance configuration
router.get(
  '/attendance/config',
  protect,
  authorize(AccessRoles.general),
  getAttendanceConfig
);

// Update late threshold (Instructor only)
router.patch(
  '/attendance/late-threshold',
  protect,
  authorize(AccessRoles.instructor),
  updateLateThreshold
);

export default router;