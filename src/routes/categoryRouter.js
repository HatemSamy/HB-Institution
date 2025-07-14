// routes/category.routes.js
import express from 'express';

import * as categoryController from '../controllers/categoryController.js';

import { authorize, protect } from '../middleware/auth.js';
import { myMulter, HME, pathName, Multer, fileValidation } from '../utils/multer.js';
import { AccessRoles } from '../utils/helpers.js';


const router = express.Router();

// Public routes
router.get('/recommended', categoryController.getRecommendedCategories);
router.get('/', categoryController.getAllCategories);
router.get('/:id', categoryController.getCategoryById);
// Protected routes (Create / Update / Delete)
router.post('/', protect, Multer(fileValidation.image).single('image'), HME, categoryController.createCategory);



router.delete('/:id', protect,authorize(AccessRoles.instructor), categoryController.deleteCategory);

export default router;
