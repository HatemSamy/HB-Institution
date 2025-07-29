import express from 'express';
import * as NoteController  from '../controllers/noteController.js';
import { authorize, protect } from '../middleware/auth.js';
import { AccessRoles } from '../utils/helpers.js';
import { validation } from '../middleware/validation.js';
import { noteSchema } from '../validations/noteValidation.js';

const router = express.Router();

router.post(
  '/',
  protect,
  authorize(AccessRoles.DoupleRole),
  validation(noteSchema),
  NoteController.sendNote
);



router.get(
  '/',
  protect,
  authorize(AccessRoles.Admin),
  NoteController.getAllNotes
);

router.delete(
  '/:id',
  protect,
  authorize(AccessRoles.Admin),
  NoteController.deleteNote
);



export default router;
