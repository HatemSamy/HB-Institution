// validators/unit.validator.js
import Joi from 'joi';


export const unitSchema = Joi.object({
  title: Joi.string().trim().required().messages({
    'string.empty': 'Title is required',
    'any.required': 'Title is required',
  }),

  description: Joi.string().trim().required().messages({
    'string.empty': 'Description is required',
    'any.required': 'Description is required',
  }),

  topic: Joi.array().items(
    Joi.string().trim()
  ),

  content: Joi.string().allow('', null),

  Completed: Joi.boolean().optional(),

  lock: Joi.boolean().optional(),

});



export const updateUnitSchema = {
    body: Joi.object({
        title: Joi.string().trim().min(3),
        description: Joi.string().trim().min(5),
        topic: Joi.array().items(Joi.string().max(300)),
        content: Joi.string(),
        Completed: Joi.boolean(),
        lock: Joi.boolean()

    })
};