import express from 'express';
import {
  trackAndRedirectToMeeting,
  generateTrackedJoinURLs,
  getJoinStatistics,
  generateBulkTrackedURLs
} from '../controllers/joinTrackingController.js';
import { protect, authorize } from '../middleware/auth.js';
import { AccessRoles } from '../utils/helpers.js';

const router = express.Router();

// This is the URL students will click to join meetings
router.get('/join/:meetingId/:role/:userId', trackAndRedirectToMeeting);

// Protected routes (require authentication)
router.use(protect);

// Generate tracked join URLs for a meeting
router.get('/meeting/:meetingId/tracked-urls', 
  authorize(AccessRoles.general), 
  generateTrackedJoinURLs
);

// Get join statistics for a meeting (instructor only)
router.get('/meeting/:meetingId/join-stats', 
  authorize(AccessRoles.instructor), 
  getJoinStatistics
);

// Generate bulk tracked URLs for all students (instructor only)
router.get('/meeting/:meetingId/bulk-urls', 
  authorize(AccessRoles.instructor), 
  generateBulkTrackedURLs
);

export default router;