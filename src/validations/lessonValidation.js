import Joi from 'joi';

export const updateLessonSchema = {
  body: Joi.object({
    title: Joi.string()
      .trim()
      .messages({
        'string.empty': 'Title cannot be empty',
        'string.min': 'Title must be at least {#limit} characters',
        'string.max': 'Title cannot exceed {#limit} characters'
      }),

    description: Joi.string()
      .trim()
      .messages({
        'string.empty': 'Description cannot be empty',
        'string.min': 'Description must be at least {#limit} characters',
        'string.max': 'Description cannot exceed {#limit} characters'
      }),

    content: Joi.string()
      .trim()
      .messages({
        'string.empty': 'Content cannot be empty',
        'string.min': 'Content must be at least {#limit} characters'
      }),


  })
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided for update'
  })
};










export const createLessonSchema = {
  body: Joi.object({
    title: Joi.string().trim().required().min(3).max(100),
    description: Joi.string().trim().required().min(10).max(500),
    content: Joi.string().trim().required().min(20),
    unitId: Joi.string().hex().length(24).required(),
    
  })
};