import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/login', authController.login);

// Protected routes
router.get('/verify', authMiddleware, authController.verify);
router.post('/logout', authMiddleware, authController.logout);

export default router;