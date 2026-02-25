"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const auth_2 = __importDefault(require("./auth"));
const peopleController = __importStar(require("../controllers/peopleController"));
const expensesController = __importStar(require("../controllers/expensesController"));
const categoriesController = __importStar(require("../controllers/categoriesController"));
const settingsController = __importStar(require("../controllers/settingsController"));
const router = (0, express_1.Router)();
// Auth routes (some public, some protected)
router.use('/auth', auth_2.default);
// All routes below require authentication
router.use(auth_1.authMiddleware);
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
exports.default = router;
//# sourceMappingURL=index.js.map