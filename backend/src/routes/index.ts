import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import authRoutes from './auth';
import * as peopleController from '../controllers/peopleController';
import * as expensesController from '../controllers/expensesController';
import * as categoriesController from '../controllers/categoriesController';
import * as settingsController from '../controllers/settingsController';

const router = Router();

// Auth routes (some public, some protected)
router.use('/auth', authRoutes);

// All routes below require authentication
router.use(authMiddleware);

// People routes
router.get('/people', peopleController.getAll);
router.get('/people/:id', peopleController.getById);
router.post('/people', peopleController.create);
router.put('/people/:id', peopleController.update);
router.delete('/people/:id', peopleController.remove);

// Expenses routes
router.get('/expenses', expensesController.getAll);
router.get('/expenses/:id', expensesController.getById);
router.post('/expenses', expensesController.create);
router.post('/expenses/bulk', expensesController.createBulk);
router.put('/expenses/:id', expensesController.update);
router.delete('/expenses/:id', expensesController.remove);
router.delete('/expenses/group/:groupId', expensesController.removeByGroup);
router.patch('/expenses/:id/split/:personId/paid', expensesController.markSplitPaid);
router.patch('/expenses/:id/monthly-payment', expensesController.markMonthlyPayment);

// Categories routes
router.get('/categories', categoriesController.getAll);
router.get('/categories/:id', categoriesController.getById);
router.post('/categories', categoriesController.create);
router.put('/categories/:id', categoriesController.update);
router.delete('/categories/:id', categoriesController.remove);
router.post('/categories/reset', categoriesController.reset);

// Settings routes
router.get('/settings', settingsController.get);
router.put('/settings', settingsController.update);

// Backup/Restore routes
router.get('/backup/export', settingsController.exportData);
router.post('/backup/import', settingsController.importData);
router.delete('/backup/clear', settingsController.clearAll);

export default router;