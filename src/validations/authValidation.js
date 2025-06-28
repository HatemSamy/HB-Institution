
import Joi from 'joi';

// Validation schemas

export const registerSchema = {
  body:Joi.object({
  firstName: Joi.string().trim().max(25).required().messages({
    'string.empty': 'First name is required',
    'string.max': 'First name cannot be more than 25 characters',
    'any.required': 'First name is required'
  }),
  lastName: Joi.string().trim().max(25).required().messages({
    'string.empty': 'Last name is required',
    'string.max': 'Last name cannot be more than 25 characters',
    'any.required': 'Last name is required'
  }),
  email: Joi.string().email().required().messages({
    'string.empty': 'Email is required',
    'string.email': 'Please provide a valid email',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'string.empty': 'Password is required',
    'any.required': 'Password is required'
  }),
  confirmPassword: Joi.any()
    .equal(Joi.ref('password'))
    .required()
    .label('Confirm password')
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Please confirm your password'
    }),
 
  specialization: Joi.when('role', {
    is: 'instructor',
    then: Joi.string().required(),
    otherwise: Joi.forbidden()
  }),
   
  role: Joi.string().valid('student', 'instructor', 'admin').default('student')
})
};



export const loginSchema ={body: Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .required()
    .messages({
      'string.empty': 'Password is required',
      'any.required': 'Password is required'
    })
 })};

 export const forgotPasswordSchema = {body:Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email',
      'any.required': 'Email is required'
    })
} )};

export const resetPasswordSchema = {body:Joi.object({
  email: Joi.string().email().required().messages({
    'string.empty': 'Email is required',
    'string.email': 'Please provide a valid email'
  }),
  newPassword: Joi.string().min(6).required().messages({
    'string.empty': 'New password is required',
    'string.min': 'Password must be at least 6 characters'
  })
})};


export const verifyResetCodeSchema = {body:Joi.object({
  code: Joi.string().length(6).required().messages({
    'string.empty': 'Reset code is required',
    'string.length': 'Reset code must be 6 characters'
  })
})};
 
