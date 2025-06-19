
import joi from 'joi';

// Validation schemas
export const registerSchema = joi.object({
  firstName: joi.string()
    .trim()
    .max(25)
    .required()
    .messages({
      'string.empty': 'First name is required',
      'string.max': 'First name cannot be more than 25 characters',
      'any.required': 'First name is required'
    }),
  lastName: joi.string()
    .trim()
    .max(25)
    .required()
    .messages({
      'string.empty': 'Last name is required',
      'string.max': 'Last name cannot be more than 25 characters',
      'any.required': 'Last name is required'
    }),
  email: joi.string()
    .email()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email',
      'any.required': 'Email is required'
    }),
  password: joi.string()
    .min(6)
    .required()
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 6 characters',
      'any.required': 'Password is required'
    }),
  role: joi.string()
    .valid('student', 'instructor', 'admin')
    .default('student')
});

export const loginSchema = joi.object({
  email: joi.string()
    .email()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email',
      'any.required': 'Email is required'
    }),
  password: joi.string()
    .required()
    .messages({
      'string.empty': 'Password is required',
      'any.required': 'Password is required'
    })
});

 export const forgotPasswordSchema = joi.object({
  email: joi.string()
    .email()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email',
      'any.required': 'Email is required'
    })
});

export const resetPasswordSchema = joi.object({
  email: joi.string().email().required().messages({
    'string.empty': 'Email is required',
    'string.email': 'Please provide a valid email'
  }),
  newPassword: joi.string().min(6).required().messages({
    'string.empty': 'New password is required',
    'string.min': 'Password must be at least 6 characters'
  })
});


export const verifyResetCodeSchema = joi.object({
  code: joi.string().length(6).required().messages({
    'string.empty': 'Reset code is required',
    'string.length': 'Reset code must be 6 characters'
  })
});

