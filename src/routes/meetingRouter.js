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

// Test timezone conversion endpoint
router.post(
  '/test-timezone',
  protect,
  addMomentTimezoneSupport,
  (req, res) => {
    res.json({
      success: true,
      message: 'Timezone test completed',
      data: {
        originalBody: {
          scheduledDate: req.body.scheduledDate,
          scheduledTime: req.body.scheduledTime,
          timezone: req.body.timezone
        },
        processedData: {
          scheduledStartTime: req.body.scheduledStartTime,
          parsedTimezone: req.body._parsedTimezone,
          originalLocalTime: req.body._originalLocalTime
        },
        serverInfo: {
          serverTime: new Date().toISOString(),
          serverTimezone: process.env.TZ || 'Not set'
        }
      }
    });
  }
);



export default router;