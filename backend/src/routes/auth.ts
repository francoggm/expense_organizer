import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';
import { loginRateLimiter } from '../middleware/rateLimiter';
import { bruteForceProtection } from '../middleware/bruteForceProtection';

const router = Router();

// Public routes
// Aplica rate limiting e proteção contra brute force na rota de login
router.post('/login', loginRateLimiter, bruteForceProtection, authController.login);

// Protected routes
router.get('/verify', authMiddleware, authController.verify);
router.post('/logout', authMiddleware, authController.logout);

export default router;