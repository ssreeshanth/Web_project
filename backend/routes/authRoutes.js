import { Router } from 'express';
import { login, me, register } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../utils/errors.js';

const router = Router();

router.post('/login', login);
router.post('/register', asyncHandler(register));
router.get('/me', authMiddleware, me);

export default router;
