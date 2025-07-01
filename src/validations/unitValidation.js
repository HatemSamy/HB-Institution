// validators/unit.validator.js
import Joi from 'joi';

export const unitSchema = {
    body: Joi.object({
        title: Joi.string().trim().required().min(3),
        description: Joi.string().required().trim().min(5),
        topic: Joi.array().items(Joi.string().max(300)),
        content: Joi.string(),
         Completed: Joi.boolean(),
        lock: Joi.boolean(),
        courseId: Joi.string().required().messages({
            'any.required': 'Course ID is required',
        }),
    })
};



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