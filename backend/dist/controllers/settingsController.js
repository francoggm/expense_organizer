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
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearAll = exports.importData = exports.exportData = exports.update = exports.get = void 0;
const database_1 = require("../config/database");
// Default settings
const DEFAULT_SETTINGS = {
    theme: 'system',
    currency: 'BRL',
    locale: 'pt-BR',
};
// Convert database row to AppSettings object
const rowToSettings = (row) => ({
    theme: row.theme,
    currency: row.currency,
    locale: row.locale,
});
// Get settings
const get = async (_req, res) => {
    try {
        const result = await (0, database_1.query)('SELECT * FROM settings WHERE id = 1');
        if (result.rows.length === 0) {
            // Insert default settings if not exists
            await (0, database_1.query)(`INSERT INTO settings (id, theme, currency, locale)
         VALUES (1, $1, $2, $3)`, [DEFAULT_SETTINGS.theme, DEFAULT_SETTINGS.currency, DEFAULT_SETTINGS.locale]);
            res.json({
                success: true,
                data: DEFAULT_SETTINGS,
            });
            return;
        }
        res.json({
            success: true,
            data: rowToSettings(result.rows[0]),
        });
    }
    catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch settings',
        });
    }
};
exports.get = get;
// Update settings
const update = async (req, res) => {
    try {
        const { theme, currency, locale } = req.body;
        // Check if settings exist
        const existsResult = await (0, database_1.query)('SELECT id FROM settings WHERE id = 1');
        let result;
        if (existsResult.rows.length === 0) {
            // Insert new settings
            result = await (0, database_1.query)(`INSERT INTO settings (id, theme, currency, locale)
         VALUES (1, $1, $2, $3)
         RETURNING *`, [theme || DEFAULT_SETTINGS.theme, currency || DEFAULT_SETTINGS.currency, locale || DEFAULT_SETTINGS.locale]);
        }
        else {
            // Update existing settings
            result = await (0, database_1.query)(`UPDATE settings
         SET theme = $1, currency = $2, locale = $3
         WHERE id = 1
         RETURNING *`, [theme || DEFAULT_SETTINGS.theme, currency || DEFAULT_SETTINGS.currency, locale || DEFAULT_SETTINGS.locale]);
        }
        res.json({
            success: true,
            data: rowToSettings(result.rows[0]),
        });
    }
    catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update settings',
        });
    }
};
exports.update = update;
// Export all data (backup)
const exportData = async (_req, res) => {
    try {
        const peopleResult = await (0, database_1.query)('SELECT * FROM people ORDER BY created_at ASC');
        const expensesResult = await (0, database_1.query)('SELECT * FROM expenses ORDER BY created_at DESC');
        const splitsResult = await (0, database_1.query)('SELECT * FROM expense_splits');
        const monthlyPaymentsResult = await (0, database_1.query)('SELECT * FROM monthly_payments');
        const monthlyPaymentSplitsResult = await (0, database_1.query)('SELECT * FROM monthly_payment_splits');
        const categoriesResult = await (0, database_1.query)('SELECT * FROM categories ORDER BY name ASC');
        const settingsResult = await (0, database_1.query)('SELECT * FROM settings WHERE id = 1');
        // Convert people
        const people = peopleResult.rows.map((row) => ({
            id: row.id,
            name: row.name,
            email: row.email || undefined,
            color: row.color,
            createdAt: row.created_at.toISOString(),
        }));
        // Convert expenses with their relations
        const expenses = expensesResult.rows.map((row) => {
            const splits = splitsResult.rows
                .filter((s) => s.expense_id === row.id)
                .map((s) => ({
                personId: s.person_id,
                amount: parseFloat(s.amount),
                percentage: parseFloat(s.percentage),
                isPaid: s.is_paid,
                paidAt: s.paid_at?.toISOString(),
            }));
            const monthlyPayments = monthlyPaymentsResult.rows
                .filter((mp) => mp.expense_id === row.id)
                .map((mp) => {
                const splitPayments = monthlyPaymentSplitsResult.rows
                    .filter((mps) => mps.monthly_payment_id === mp.id)
                    .map((mps) => ({
                    personId: mps.person_id,
                    isPaid: mps.is_paid,
                    paidAt: mps.paid_at?.toISOString(),
                }));
                return {
                    month: mp.month,
                    year: mp.year,
                    isPaid: mp.is_paid,
                    paidAt: mp.paid_at?.toISOString(),
                    splitPayments: splitPayments.length > 0 ? splitPayments : undefined,
                };
            });
            return {
                id: row.id,
                description: row.description,
                category: row.category,
                type: row.type,
                totalAmount: parseFloat(row.total_amount),
                paymentMethod: row.payment_method,
                installments: row.installments,
                currentInstallment: row.current_installment,
                installmentGroupId: row.installment_group_id || undefined,
                dueDay: row.due_day || undefined,
                dueDate: row.due_date?.toISOString().split('T')[0],
                paidById: row.paid_by_id,
                splitBetween: splits,
                status: row.status,
                isRecurring: row.is_recurring,
                isVariableAmount: row.is_variable_amount,
                notes: row.notes || undefined,
                createdAt: row.created_at.toISOString(),
                paidAt: row.paid_at?.toISOString(),
                monthlyPayments: monthlyPayments.length > 0 ? monthlyPayments : undefined,
            };
        });
        // Convert categories
        const categories = categoriesResult.rows.map((row) => ({
            id: row.id,
            name: row.name,
            icon: row.icon,
            color: row.color,
            type: row.type,
        }));
        // Convert settings
        const settings = settingsResult.rows.length > 0
            ? rowToSettings(settingsResult.rows[0])
            : DEFAULT_SETTINGS;
        const backupData = {
            people,
            expenses,
            categories,
            settings,
            exportedAt: new Date().toISOString(),
            version: '1.0.0',
        };
        res.json({
            success: true,
            data: backupData,
        });
    }
    catch (error) {
        console.error('Error exporting data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to export data',
        });
    }
};
exports.exportData = exportData;
// Import data (restore backup)
const importData = async (req, res) => {
    const client = await (0, database_1.getClient)();
    try {
        await client.query('BEGIN');
        const backupData = req.body;
        // Clear existing data (in reverse order of dependencies)
        await client.query('DELETE FROM monthly_payment_splits');
        await client.query('DELETE FROM monthly_payments');
        await client.query('DELETE FROM expense_splits');
        await client.query('DELETE FROM expenses');
        await client.query('DELETE FROM people');
        await client.query('DELETE FROM categories');
        // Import people
        for (const person of backupData.people || []) {
            await client.query(`INSERT INTO people (id, name, email, color, created_at)
         VALUES ($1, $2, $3, $4, $5)`, [person.id, person.name, person.email || null, person.color, person.createdAt]);
        }
        // Import categories
        for (const category of backupData.categories || []) {
            await client.query(`INSERT INTO categories (id, name, icon, color, type)
         VALUES ($1, $2, $3, $4, $5)`, [category.id, category.name, category.icon, category.color, category.type]);
        }
        // Import expenses with their relations
        for (const expense of backupData.expenses || []) {
            await client.query(`INSERT INTO expenses (
          id, description, category, type, total_amount, payment_method,
          installments, current_installment, installment_group_id,
          due_day, due_date, paid_by_id, status, is_recurring,
          is_variable_amount, notes, created_at, paid_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`, [
                expense.id,
                expense.description,
                expense.category,
                expense.type,
                expense.totalAmount,
                expense.paymentMethod,
                expense.installments || 1,
                expense.currentInstallment || 1,
                expense.installmentGroupId || null,
                expense.dueDay || null,
                expense.dueDate || null,
                expense.paidById,
                expense.status || 'pending',
                expense.isRecurring || false,
                expense.isVariableAmount || false,
                expense.notes || null,
                expense.createdAt,
                expense.paidAt || null,
            ]);
            // Import splits
            for (const split of expense.splitBetween || []) {
                const { v4: uuidv4 } = await Promise.resolve().then(() => __importStar(require('uuid')));
                await client.query(`INSERT INTO expense_splits (id, expense_id, person_id, amount, percentage, is_paid, paid_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
                    uuidv4(),
                    expense.id,
                    split.personId,
                    split.amount,
                    split.percentage,
                    split.isPaid || false,
                    split.paidAt || null,
                ]);
            }
            // Import monthly payments
            for (const mp of expense.monthlyPayments || []) {
                const { v4: uuidv4 } = await Promise.resolve().then(() => __importStar(require('uuid')));
                const mpId = uuidv4();
                await client.query(`INSERT INTO monthly_payments (id, expense_id, month, year, is_paid, paid_at)
           VALUES ($1, $2, $3, $4, $5, $6)`, [mpId, expense.id, mp.month, mp.year, mp.isPaid || false, mp.paidAt || null]);
                // Import monthly payment splits
                for (const mps of mp.splitPayments || []) {
                    await client.query(`INSERT INTO monthly_payment_splits (id, monthly_payment_id, person_id, is_paid, paid_at)
             VALUES ($1, $2, $3, $4, $5)`, [uuidv4(), mpId, mps.personId, mps.isPaid || false, mps.paidAt || null]);
                }
            }
        }
        // Import settings
        if (backupData.settings) {
            await client.query('DELETE FROM settings');
            await client.query(`INSERT INTO settings (id, theme, currency, locale)
         VALUES (1, $1, $2, $3)`, [backupData.settings.theme, backupData.settings.currency, backupData.settings.locale]);
        }
        await client.query('COMMIT');
        res.json({
            success: true,
            message: 'Data imported successfully',
        });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error importing data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to import data',
        });
    }
    finally {
        client.release();
    }
};
exports.importData = importData;
// Clear all data
const clearAll = async (_req, res) => {
    const client = await (0, database_1.getClient)();
    try {
        await client.query('BEGIN');
        // Clear all data (in reverse order of dependencies)
        await client.query('DELETE FROM monthly_payment_splits');
        await client.query('DELETE FROM monthly_payments');
        await client.query('DELETE FROM expense_splits');
        await client.query('DELETE FROM expenses');
        await client.query('DELETE FROM people');
        // Don't delete categories and settings, just reset them
        await client.query('DELETE FROM categories');
        await client.query('DELETE FROM settings');
        await client.query('COMMIT');
        res.json({
            success: true,
            message: 'All data cleared successfully',
        });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error clearing data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear data',
        });
    }
    finally {
        client.release();
    }
};
exports.clearAll = clearAll;
//# sourceMappingURL=settingsController.js.map