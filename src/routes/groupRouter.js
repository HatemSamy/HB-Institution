// routes/groupRoutes.js
import express from 'express';
import { createGroup } from '../controllers/groupController.js';

const router = express.Router();

router.post('/', createGroup);

export default router;