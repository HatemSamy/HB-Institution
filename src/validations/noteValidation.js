import Joi from 'joi';

export const noteSchema = Joi.object({
  message: Joi.string().min(5).max(1000).required(),
});