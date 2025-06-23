// validators/course.validation.js
import Joi from 'joi';

export const createCourseSchema = {
  body:Joi.object({
  title: Joi.string().min(3).max(100).required(),
  description: Joi.string().min(10).required(),
  price: Joi.number().min(0).required(),

  level: Joi.string()
    .valid('beginner', 'intermediate', 'advanced')
    .required(),

  duration: Joi.object({
    days: Joi.number().min(0).default(0),
    hours: Joi.number().min(0).default(0),
  }).required(),
 
})};




// validations/courseRatingParam.validation.js


export const ratingParamsSchema = {
  params:Joi.object({
  courseId: Joi.string().hex().length(24).required()
    .messages({
      'any.required': 'Course ID is required',
      'string.length': 'Course ID must be 24 hex characters'
    }),
  rating: Joi.number().integer().min(1).max(5).required()
    .messages({
      'number.base': 'Rating must be a number',
      'number.min': 'Rating must be at least 1',
      'number.max': 'Rating cannot exceed 5'
    })
})};
