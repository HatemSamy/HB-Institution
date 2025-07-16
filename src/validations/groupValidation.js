import Joi from 'joi';

export const createGroupSchema = {
  body: Joi.object({
    code: Joi.string().trim().required().messages({
      'string.empty': 'Group code is required',
      'any.required': 'Group code is required'
    }),
    courseId: Joi.string().hex().length(24).required().messages({
      'string.hex': 'Invalid course ID format',
      'string.length': 'Course ID must be 24 characters'
    }),
    instructorId: Joi.string().hex().length(24).required().messages({
      'string.hex': 'Invalid instructor ID format',
      'string.length': 'Instructor ID must be 24 characters'
    }),
    level: Joi.string().valid('Beginner', 'Intermediate', 'Advanced').required(),
    maxStudents: Joi.number().integer().min(1).max(100).default(30),
    schedule: Joi.array().items(
      Joi.object({
        dayOfWeek: Joi.string().valid(
          'Monday', 'Tuesday', 'Wednesday', 
          'Thursday', 'Friday', 'Saturday', 'Sunday'
        ).required(),
        startTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
        endTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
        timezone: Joi.string().default('UTC')
      })
    ).min(1).required()
  })
};


export const updateGroupSchema = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required()
  }),
  body: Joi.object({
    code: Joi.string().trim(),
    courseId: Joi.string().hex().length(24),
    instructorId: Joi.string().hex().length(24),
    level: Joi.string().valid('Beginner', 'Intermediate', 'Advanced'),
    maxStudents: Joi.number().integer().min(1).max(100),
    schedule: Joi.array().items(
      Joi.object({
        dayOfWeek: Joi.string().valid(
          'Monday', 'Tuesday', 'Wednesday', 
          'Thursday', 'Friday', 'Saturday', 'Sunday'
        ),
        startTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
        endTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
        timezone: Joi.string()
      })
    ).min(1),
    isActive: Joi.boolean()
  }).min(1) 
};




export const getGroupByIdSchema = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required()
  })
};