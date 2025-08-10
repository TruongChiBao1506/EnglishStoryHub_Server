import { Router } from 'express';
import {
  generateStoryStarter,
  checkStoryContent,
  generateStoryPrompts,
  suggestVocabulary,
  testGeminiConnection
} from '../controllers/aiControllers';
import { authenticate } from '../middleware/auth';

const router = Router();

// Test endpoint (no auth needed)
router.get('/test', testGeminiConnection);

// Generate story starter based on prompt
router.post('/story-starter', authenticate, generateStoryStarter);

// Check story content for grammar and style
router.post('/check-story', authenticate, checkStoryContent);

// Generate story prompts based on user level and topic (no auth needed)
router.get('/story-prompts', generateStoryPrompts);

// Suggest vocabulary based on story content
router.post('/vocabulary', authenticate, suggestVocabulary);

export default router;