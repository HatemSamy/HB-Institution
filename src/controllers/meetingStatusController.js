import { asynchandler, AppError } from "../middleware/erroeHandling.js";
import Meeting from "../models/Meeting.js";
import meetingStatusChecker from "../services/meetingStatusChecker.js";

/**
 * Manually check if a meeting has ended on BBB
 */
export const checkMeetingStatus = asynchandler(async (req, res) => {
  const { meetingId } = req.params;
  const userRole = req.user.role;

  // Only instructors can check meeting status
  if (userRole !== 'instructor') {
    throw new AppError('Only instructors can check meeting status', 403);
  }

  try {
    const result = await meetingStatusChecker.checkMeetingStatus(meetingId);
    
    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        meetingId,
        status: result.status,
        checkedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    throw new AppError(error.message || 'Failed to check meeting status', 500);
  }
});

/**
 * Force end a meeting (manual override)
 */
export const forceEndMeeting = asynchandler(async (req, res) => {
  const { meetingId } = req.params;
  const instructorId = req.user._id;
  const userRole = req.user.role;

  if (userRole !== 'instructor') {
    throw new AppError('Only instructors can end meetings', 403);
  }

  // Find the meeting
  const meeting = await Meeting.findOne({ meetingID: meetingId })
    .populate('lessonId', 'title')
    .populate('groupId', 'code');

  if (!meeting) {
    throw new AppError('Meeting not found', 404);
  }

  // Check if instructor is authorized
  if (!meeting.instructorId.equals(instructorId)) {
    throw new AppError('You are not authorized to end this meeting', 403);
  }

  // Check if meeting is active
  if (meeting.status !== 'active') {
    throw new AppError('Meeting is not active', 400);
  }

  try {
    // Force end the meeting
    await meetingStatusChecker.endMeeting(meeting);

    res.status(200).json({
      success: true,
      message: 'Meeting ended successfully',
      data: {
        meeting: {
          id: meeting._id,
          meetingID: meeting.meetingID,
          title: meeting.title,
          status: 'ended',
          endedAt: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    throw new AppError(error.message || 'Failed to end meeting', 500);
  }
});

/**
 * Get meeting status checker info
 */
export const getStatusCheckerInfo = asynchandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      isRunning: meetingStatusChecker.isRunning,
      checkInterval: meetingStatusChecker.checkInterval,
      description: 'Automatically checks BBB meetings every 30 seconds and ends meetings that are no longer running'
    }
  });
});