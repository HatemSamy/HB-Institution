import { AppError, asynchandler } from "../middleware/erroeHandling.js";
import Course from "../models/Course.js";
import History from "../models/history.js";
import { HISTORY_ACTIONS } from "../utils/historyActions.js";


export const getUserHistoryByAdmin = asynchandler(async (req, res) => {
  const { userId } = req.params;

  const history = await History.find({ user: userId })
    .sort('-createdAt')
    .lean();

  if (!history.length) throw new AppError('No history found for this user', 404);

  const enrichedHistory = await Promise.all(history.map(async (entry) => {
    let metadata = entry.metadata;

    if (entry.action === HISTORY_ACTIONS.ENROLL_COURSE && metadata?.courseId) {
      const course = await Course.findById(metadata.courseId).select('title').lean();
      if (course) {
        metadata.courseTitle = course.title;
      }
    }

    return {
      id: entry._id,
      action: entry.action,
      metadata,
      createdAt: entry.createdAt,
    };
  }));

  res.status(200).json({
    success: true,
    count: enrichedHistory.length,
    data: enrichedHistory,
  });
});
