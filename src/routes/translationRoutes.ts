import express from 'express';
import { translateText } from '../controllers/translationController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// POST /api/translate
router.post('/', authenticate, translateText);

export default router;
