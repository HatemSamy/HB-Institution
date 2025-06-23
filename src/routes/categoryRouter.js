import express from 'express';


import { authorize, protect } from '../middleware/auth.js';
import { createCategory, deleteCategory, getAllCategories, getCategory, getCategoryWithCourses, updateCategory } from '../controllers/categoryController.js';
import { AccessRoles } from '../utils/helpers.js';

const router = express.Router();

router
  .route('/')
  .get(protect, getAllCategories)
  .post(protect, authorize(AccessRoles.Admin), createCategory);

router
  .route('/:id')
  .get(protect, getCategoryWithCourses)
  .put(protect, updateCategory)
  .delete(protect, deleteCategory);

export default router;
