import Joi from 'joi';

// Create meeting validation schema
export const createMeetingSchema = Joi.object({
  lessonId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Lesson ID must be a valid MongoDB ObjectId',
      'any.required': 'Lesson ID is required'
    }),
    
  groupId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Group ID must be a valid MongoDB ObjectId',
      'any.required': 'Group ID is required'
    }),
    
  title: Joi.string()
    .min(3)
    .max(200)
    .trim()
    .optional()
    .messages({
      'string.min': 'Meeting title must be at least 3 characters long',
      'string.max': 'Meeting title cannot exceed 200 characters'
    }),
    
  description: Joi.string()
    .max(1000)
    .trim()
    .optional()
    .messages({
      'string.max': 'Meeting description cannot exceed 1000 characters'
    }),
    
  duration: Joi.number()
    .integer()
    .min(15)
    .max(480)
    .optional()
    .default(120)
    .messages({
      'number.base': 'Duration must be a number',
      'number.integer': 'Duration must be an integer',
      'number.min': 'Duration must be at least 15 minutes',
      'number.max': 'Duration cannot exceed 480 minutes (8 hours)'
    }),
    
  scheduledStartTime: Joi.date()
    .optional()
    .default(() => new Date())
    .messages({
      'date.base': 'Scheduled start time must be a valid date'
    }),
    
  settings: Joi.object({
    recordMeeting: Joi.boolean().optional().default(true),
    autoStartRecording: Joi.boolean().optional().default(false),
    allowStartStopRecording: Joi.boolean().optional().default(true),
    muteOnStart: Joi.boolean().optional().default(true),
    webcamsOnlyForModerator: Joi.boolean().optional().default(false),
    maxParticipants: Joi.number().integer().min(2).max(100).optional().default(50),
    guestPolicy: Joi.string()
      .valid('ALWAYS_ACCEPT', 'ALWAYS_DENY', 'ASK_MODERATOR')
      .optional()
      .default('ALWAYS_ACCEPT')
  }).optional()
});

// Update meeting validation schema
export const updateMeetingSchema = Joi.object({
  title: Joi.string()
    .min(3)
    .max(200)
    .trim()
    .optional()
    .messages({
      'string.min': 'Meeting title must be at least 3 characters long',
      'string.max': 'Meeting title cannot exceed 200 characters'
    }),
    
  description: Joi.string()
    .max(1000)
    .trim()
    .optional()
    .messages({
      'string.max': 'Meeting description cannot exceed 1000 characters'
    }),
    
  notes: Joi.string()
    .max(2000)
    .trim()
    .optional()
    .messages({
      'string.max': 'Meeting notes cannot exceed 2000 characters'
    }),
    
  settings: Joi.object({
    recordMeeting: Joi.boolean().optional(),
    autoStartRecording: Joi.boolean().optional(),
    allowStartStopRecording: Joi.boolean().optional(),
    muteOnStart: Joi.boolean().optional(),
    webcamsOnlyForModerator: Joi.boolean().optional(),
    maxParticipants: Joi.number().integer().min(2).max(100).optional(),
    guestPolicy: Joi.string()
      .valid('ALWAYS_ACCEPT', 'ALWAYS_DENY', 'ASK_MODERATOR')
      .optional()
  }).optional()
});

// Meeting query validation schema
export const meetingQuerySchema = Joi.object({
  status: Joi.string()
    .valid('scheduled', 'active', 'ended', 'cancelled')
    .optional(),
    
  page: Joi.number()
    .integer()
    .min(1)
    .optional()
    .default(1),
    
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .default(20),
    
  sortBy: Joi.string()
    .valid('createdAt', 'scheduledStartTime', 'actualStartTime', 'title')
    .optional()
    .default('createdAt'),
    
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .optional()
    .default('desc')
});

// Send notifications validation schema
export const sendNotificationsSchema = Joi.object({
  studentIds: Joi.array()
    .items(
      Joi.string().pattern(/^[0-9a-fA-F]{24}$/)
    )
    .optional()
    .messages({
      'array.base': 'Student IDs must be an array',
      'string.pattern.base': 'Each student ID must be a valid MongoDB ObjectId'
    }),
    
  message: Joi.string()
    .max(500)
    .trim()
    .optional()
    .messages({
      'string.max': 'Custom message cannot exceed 500 characters'
    })
});

// Meeting ID parameter validation
export const meetingIdSchema = Joi.object({
  meetingId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Meeting ID must be a valid MongoDB ObjectId',
      'any.required': 'Meeting ID is required'
    })
});

// Lesson ID parameter validation
export const lessonIdSchema = Joi.object({
  lessonId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Lesson ID must be a valid MongoDB ObjectId',
      'any.required': 'Lesson ID is required'
    })
});