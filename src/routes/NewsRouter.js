// routes/news.routes.js
import express from 'express';
import * as NewsController from '../controllers/NewsController.js';
import { authorize, protect } from '../middleware/auth.js';
import { AccessRoles } from '../utils/helpers.js';
import { fileValidation, HME, Multer } from '../utils/multer.js';

const router = express.Router();


router.route('/')
  .get(NewsController.getAllNews)
  .post(protect,authorize(AccessRoles.Admin) ,Multer(fileValidation.image).single('image'),HME, NewsController.createNews);

router.route('/:id')
  .get(NewsController.getNewsById)
  .put(protect,authorize(AccessRoles.Admin),Multer(fileValidation.image).single('image'),HME,NewsController.updateNews)
  .delete(protect,authorize(AccessRoles.Admin) ,NewsController.deleteNews);

export default router;
