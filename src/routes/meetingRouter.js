import express from 'express';
import * as meetingController from '../controllers/meetingController.js';
import { authorize, protect } from '../middleware/auth.js';
import { AccessRoles } from '../utils/helpers.js';
import { validateMeetingDates } from '../middleware/dateValidation.js';
import { addMomentTimezoneSupport } from '../middleware/momentTimezone.js';

const router = express.Router({ mergeParams: true });

// Create a meeting (immediate or scheduled) (Instructor only)
router.post(
  '/create',
  protect,
  authorize(AccessRoles.instructor),
  addMomentTimezoneSupport, // Add timezone support middleware FIRST
  validateMeetingDates, // Then add date validation middleware
  meetingController.createMeeting
);

// Get instructor's meetings
router.get(
  '/instructor/meetings',
  protect,
  authorize(AccessRoles.instructor),
  meetingController.getInstructorMeetings
);



export default router;