"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markMonthlyPayment = exports.markSplitPaid = exports.removeByGroup = exports.remove = exports.update = exports.createBulk = exports.create = exports.getById = exports.getAll = void 0;
const uuid_1 = require("uuid");
const database_1 = require("../config/database");
// Convert database row to Expense object
const rowToExpense = (row, splits, monthlyPayments, monthlyPaymentSplits) => {
    const splitBetween = splits.map((s) => ({
        personId: s.person_id,
        amount: parseFloat(s.amount),
        percentage: parseFloat(s.percentage),
        isPaid: s.is_paid,
        paidAt: s.paid_at?.toISOString(),
    }));
    const payments = monthlyPayments.map((mp) => {
        const splitPayments = monthlyPaymentSplits
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
        splitBetween,
        status: row.status,
        isRecurring: row.is_recurring,
        isVariableAmount: row.is_variable_amount,
        notes: row.notes || undefined,
        createdAt: row.created_at.toISOString(),
        paidAt: row.paid_at?.toISOString(),
        monthlyPayments: payments.length > 0 ? payments : undefined,
    };
};
// Get all expenses with their splits and monthly payments
const getAll = async (_req, res) => {
    try {
        const expensesResult = await (0, database_1.query)('SELECT * FROM expenses ORDER BY created_at DESC');
        const splitsResult = await (0, database_1.query)('SELECT * FROM expense_splits');
        const monthlyPaymentsResult = await (0, database_1.query)('SELECT * FROM monthly_payments');
        const monthlyPaymentSplitsResult = await (0, database_1.query)('SELECT * FROM monthly_payment_splits');
        const expenses = expensesResult.rows.map((row) => {
            const splits = splitsResult.rows.filter((s) => s.expense_id === row.id);
            const monthlyPayments = monthlyPaymentsResult.rows.filter((mp) => mp.expense_id === row.id);
            const monthlyPaymentSplits = monthlyPaymentSplitsResult.rows.filter((mps) => monthlyPayments.some((mp) => mp.id === mps.monthly_payment_id));
            return rowToExpense(row, splits, monthlyPayments, monthlyPaymentSplits);
        });
        res.json({
            success: true,
            data: expenses,
        });
    }
    catch (error) {
        console.error('Error fetching expenses:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch expenses',
        });
    }
};
exports.getAll = getAll;
// Get expense by ID
const getById = async (req, res) => {
    try {
        const { id } = req.params;
        const expenseResult = await (0, database_1.query)('SELECT * FROM expenses WHERE id = $1', [id]);
        if (expenseResult.rows.length === 0) {
            res.status(404).json({
                success: false,
                error: 'Expense not found',
            });
            return;
        }
        const splitsResult = await (0, database_1.query)('SELECT * FROM expense_splits WHERE expense_id = $1', [id]);
        const monthlyPaymentsResult = await (0, database_1.query)('SELECT * FROM monthly_payments WHERE expense_id = $1', [id]);
        const monthlyPaymentIds = monthlyPaymentsResult.rows.map((mp) => mp.id);
        let monthlyPaymentSplitsResult = { rows: [] };
        if (monthlyPaymentIds.length > 0) {
            monthlyPaymentSplitsResult = await (0, database_1.query)('SELECT * FROM monthly_payment_splits WHERE monthly_payment_id = ANY($1)', [monthlyPaymentIds]);
        }
        const expense = rowToExpense(expenseResult.rows[0], splitsResult.rows, monthlyPaymentsResult.rows, monthlyPaymentSplitsResult.rows);
        res.json({
            success: true,
            data: expense,
        });
    }
    catch (error) {
        console.error('Error fetching expense:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch expense',
        });
    }
};
exports.getById = getById;
// Create new expense
const create = async (req, res) => {
    const client = await (0, database_1.getClient)();
    try {
        await client.query('BEGIN');
        const expense = req.body;
        const id = expense.id || (0, uuid_1.v4)();
        // Insert expense
        const expenseResult = await client.query(`INSERT INTO expenses (
        id, description, category, type, total_amount, payment_method,
        installments, current_installment, installment_group_id,
        due_day, due_date, paid_by_id, status, is_recurring,
        is_variable_amount, notes, created_at, paid_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`, [
            id,
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
            expense.createdAt || new Date().toISOString(),
            expense.paidAt || null,
        ]);
        // Insert splits
        for (const split of expense.splitBetween || []) {
            await client.query(`INSERT INTO expense_splits (id, expense_id, person_id, amount, percentage, is_paid, paid_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
                (0, uuid_1.v4)(),
                id,
                split.personId,
                split.amount,
                split.percentage,
                split.isPaid || false,
                split.paidAt || null,
            ]);
        }
        // Insert monthly payments if any
        for (const mp of expense.monthlyPayments || []) {
            const mpId = (0, uuid_1.v4)();
            await client.query(`INSERT INTO monthly_payments (id, expense_id, month, year, is_paid, paid_at)
         VALUES ($1, $2, $3, $4, $5, $6)`, [mpId, id, mp.month, mp.year, mp.isPaid || false, mp.paidAt || null]);
            // Insert monthly payment splits
            for (const mps of mp.splitPayments || []) {
                await client.query(`INSERT INTO monthly_payment_splits (id, monthly_payment_id, person_id, is_paid, paid_at)
           VALUES ($1, $2, $3, $4, $5)`, [(0, uuid_1.v4)(), mpId, mps.personId, mps.isPaid || false, mps.paidAt || null]);
            }
        }
        await client.query('COMMIT');
        // Fetch the complete expense with all relations
        const splitsResult = await (0, database_1.query)('SELECT * FROM expense_splits WHERE expense_id = $1', [id]);
        const monthlyPaymentsResult = await (0, database_1.query)('SELECT * FROM monthly_payments WHERE expense_id = $1', [id]);
        const monthlyPaymentIds = monthlyPaymentsResult.rows.map((mp) => mp.id);
        let monthlyPaymentSplitsResult = { rows: [] };
        if (monthlyPaymentIds.length > 0) {
            monthlyPaymentSplitsResult = await (0, database_1.query)('SELECT * FROM monthly_payment_splits WHERE monthly_payment_id = ANY($1)', [monthlyPaymentIds]);
        }
        const createdExpense = rowToExpense(expenseResult.rows[0], splitsResult.rows, monthlyPaymentsResult.rows, monthlyPaymentSplitsResult.rows);
        res.status(201).json({
            success: true,
            data: createdExpense,
        });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating expense:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create expense',
        });
    }
    finally {
        client.release();
    }
};
exports.create = create;
// Create multiple expenses (for installments)
const createBulk = async (req, res) => {
    const client = await (0, database_1.getClient)();
    try {
        await client.query('BEGIN');
        const expenses = req.body;
        const createdExpenses = [];
        for (const expense of expenses) {
            const id = expense.id || (0, uuid_1.v4)();
            // Insert expense
            const expenseResult = await client.query(`INSERT INTO expenses (
          id, description, category, type, total_amount, payment_method,
          installments, current_installment, installment_group_id,
          due_day, due_date, paid_by_id, status, is_recurring,
          is_variable_amount, notes, created_at, paid_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *`, [
                id,
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
                expense.createdAt || new Date().toISOString(),
                expense.paidAt || null,
            ]);
            // Insert splits
            const splits = [];
            for (const split of expense.splitBetween || []) {
                const splitResult = await client.query(`INSERT INTO expense_splits (id, expense_id, person_id, amount, percentage, is_paid, paid_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`, [
                    (0, uuid_1.v4)(),
                    id,
                    split.personId,
                    split.amount,
                    split.percentage,
                    split.isPaid || false,
                    split.paidAt || null,
                ]);
                splits.push(splitResult.rows[0]);
            }
            createdExpenses.push(rowToExpense(expenseResult.rows[0], splits, [], []));
        }
        await client.query('COMMIT');
        res.status(201).json({
            success: true,
            data: createdExpenses,
        });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating expenses:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create expenses',
        });
    }
    finally {
        client.release();
    }
};
exports.createBulk = createBulk;
// Update expense
const update = async (req, res) => {
    const client = await (0, database_1.getClient)();
    try {
        await client.query('BEGIN');
        const { id } = req.params;
        const expense = req.body;
        // Update expense
        const expenseResult = await client.query(`UPDATE expenses SET
        description = $1, category = $2, type = $3, total_amount = $4,
        payment_method = $5, installments = $6, current_installment = $7,
        installment_group_id = $8, due_day = $9, due_date = $10,
        paid_by_id = $11, status = $12, is_recurring = $13,
        is_variable_amount = $14, notes = $15, paid_at = $16
      WHERE id = $17
      RETURNING *`, [
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
            expense.paidAt || null,
            id,
        ]);
        if (expenseResult.rows.length === 0) {
            await client.query('ROLLBACK');
            res.status(404).json({
                success: false,
                error: 'Expense not found',
            });
            return;
        }
        // Delete existing splits and recreate
        await client.query('DELETE FROM expense_splits WHERE expense_id = $1', [id]);
        for (const split of expense.splitBetween || []) {
            await client.query(`INSERT INTO expense_splits (id, expense_id, person_id, amount, percentage, is_paid, paid_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
                (0, uuid_1.v4)(),
                id,
                split.personId,
                split.amount,
                split.percentage,
                split.isPaid || false,
                split.paidAt || null,
            ]);
        }
        // Handle monthly payments update
        // First, delete existing monthly payment splits
        const existingMPs = await client.query('SELECT id FROM monthly_payments WHERE expense_id = $1', [id]);
        for (const mp of existingMPs.rows) {
            await client.query('DELETE FROM monthly_payment_splits WHERE monthly_payment_id = $1', [mp.id]);
        }
        // Then delete monthly payments
        await client.query('DELETE FROM monthly_payments WHERE expense_id = $1', [id]);
        // Recreate monthly payments
        for (const mp of expense.monthlyPayments || []) {
            const mpId = (0, uuid_1.v4)();
            await client.query(`INSERT INTO monthly_payments (id, expense_id, month, year, is_paid, paid_at)
         VALUES ($1, $2, $3, $4, $5, $6)`, [mpId, id, mp.month, mp.year, mp.isPaid || false, mp.paidAt || null]);
            for (const mps of mp.splitPayments || []) {
                await client.query(`INSERT INTO monthly_payment_splits (id, monthly_payment_id, person_id, is_paid, paid_at)
           VALUES ($1, $2, $3, $4, $5)`, [(0, uuid_1.v4)(), mpId, mps.personId, mps.isPaid || false, mps.paidAt || null]);
            }
        }
        await client.query('COMMIT');
        // Fetch updated expense
        const splitsResult = await (0, database_1.query)('SELECT * FROM expense_splits WHERE expense_id = $1', [id]);
        const monthlyPaymentsResult = await (0, database_1.query)('SELECT * FROM monthly_payments WHERE expense_id = $1', [id]);
        const monthlyPaymentIds = monthlyPaymentsResult.rows.map((mp) => mp.id);
        let monthlyPaymentSplitsResult = { rows: [] };
        if (monthlyPaymentIds.length > 0) {
            monthlyPaymentSplitsResult = await (0, database_1.query)('SELECT * FROM monthly_payment_splits WHERE monthly_payment_id = ANY($1)', [monthlyPaymentIds]);
        }
        const updatedExpense = rowToExpense(expenseResult.rows[0], splitsResult.rows, monthlyPaymentsResult.rows, monthlyPaymentSplitsResult.rows);
        res.json({
            success: true,
            data: updatedExpense,
        });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating expense:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update expense',
        });
    }
    finally {
        client.release();
    }
};
exports.update = update;
// Delete expense
const remove = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await (0, database_1.query)('DELETE FROM expenses WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                error: 'Expense not found',
            });
            return;
        }
        res.json({
            success: true,
            message: 'Expense deleted successfully',
        });
    }
    catch (error) {
        console.error('Error deleting expense:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete expense',
        });
    }
};
exports.remove = remove;
// Delete expenses by group ID (for installments)
const removeByGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const result = await (0, database_1.query)('DELETE FROM expenses WHERE installment_group_id = $1 RETURNING id', [groupId]);
        res.json({
            success: true,
            message: `Deleted ${result.rowCount} expenses`,
            data: { deletedCount: result.rowCount },
        });
    }
    catch (error) {
        console.error('Error deleting expenses by group:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete expenses',
        });
    }
};
exports.removeByGroup = removeByGroup;
// Mark split as paid
const markSplitPaid = async (req, res) => {
    try {
        const { id, personId } = req.params;
        const { isPaid } = req.body;
        // Update the split
        const splitResult = await (0, database_1.query)(`UPDATE expense_splits
       SET is_paid = $1, paid_at = $2
       WHERE expense_id = $3 AND person_id = $4
       RETURNING *`, [isPaid, isPaid ? new Date().toISOString() : null, id, personId]);
        if (splitResult.rows.length === 0) {
            res.status(404).json({
                success: false,
                error: 'Split not found',
            });
            return;
        }
        // Check if all splits are paid
        const allSplitsResult = await (0, database_1.query)('SELECT * FROM expense_splits WHERE expense_id = $1', [id]);
        const allPaid = allSplitsResult.rows.every((s) => s.is_paid);
        // Update expense status
        await (0, database_1.query)(`UPDATE expenses
       SET status = $1, paid_at = $2
       WHERE id = $3`, [allPaid ? 'paid' : 'pending', allPaid ? new Date().toISOString() : null, id]);
        // Fetch updated expense
        const expenseResult = await (0, database_1.query)('SELECT * FROM expenses WHERE id = $1', [id]);
        const monthlyPaymentsResult = await (0, database_1.query)('SELECT * FROM monthly_payments WHERE expense_id = $1', [id]);
        const monthlyPaymentIds = monthlyPaymentsResult.rows.map((mp) => mp.id);
        let monthlyPaymentSplitsResult = { rows: [] };
        if (monthlyPaymentIds.length > 0) {
            monthlyPaymentSplitsResult = await (0, database_1.query)('SELECT * FROM monthly_payment_splits WHERE monthly_payment_id = ANY($1)', [monthlyPaymentIds]);
        }
        const updatedExpense = rowToExpense(expenseResult.rows[0], allSplitsResult.rows, monthlyPaymentsResult.rows, monthlyPaymentSplitsResult.rows);
        res.json({
            success: true,
            data: updatedExpense,
        });
    }
    catch (error) {
        console.error('Error marking split as paid:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update split payment status',
        });
    }
};
exports.markSplitPaid = markSplitPaid;
// Mark monthly payment
const markMonthlyPayment = async (req, res) => {
    const client = await (0, database_1.getClient)();
    try {
        await client.query('BEGIN');
        const { id } = req.params;
        const { month, year, isPaid, personId } = req.body;
        // Check if monthly payment exists
        let mpResult = await client.query('SELECT * FROM monthly_payments WHERE expense_id = $1 AND month = $2 AND year = $3', [id, month, year]);
        let mpId;
        if (mpResult.rows.length === 0) {
            // Create new monthly payment
            mpId = (0, uuid_1.v4)();
            // Get expense splits to create split payments
            const splitsResult = await client.query('SELECT person_id FROM expense_splits WHERE expense_id = $1', [id]);
            await client.query(`INSERT INTO monthly_payments (id, expense_id, month, year, is_paid, paid_at)
         VALUES ($1, $2, $3, $4, $5, $6)`, [mpId, id, month, year, personId ? false : isPaid, personId ? null : (isPaid ? new Date().toISOString() : null)]);
            // Create split payments for each person
            for (const split of splitsResult.rows) {
                const splitIsPaid = personId ? (split.person_id === personId && isPaid) : isPaid;
                await client.query(`INSERT INTO monthly_payment_splits (id, monthly_payment_id, person_id, is_paid, paid_at)
           VALUES ($1, $2, $3, $4, $5)`, [(0, uuid_1.v4)(), mpId, split.person_id, splitIsPaid, splitIsPaid ? new Date().toISOString() : null]);
            }
        }
        else {
            mpId = mpResult.rows[0].id;
            if (personId) {
                // Update specific person's payment
                await client.query(`UPDATE monthly_payment_splits
           SET is_paid = $1, paid_at = $2
           WHERE monthly_payment_id = $3 AND person_id = $4`, [isPaid, isPaid ? new Date().toISOString() : null, mpId, personId]);
                // Check if all splits are paid
                const allSplitsResult = await client.query('SELECT * FROM monthly_payment_splits WHERE monthly_payment_id = $1', [mpId]);
                const allPaid = allSplitsResult.rows.every((s) => s.is_paid);
                // Update monthly payment status
                await client.query(`UPDATE monthly_payments
           SET is_paid = $1, paid_at = $2
           WHERE id = $3`, [allPaid, allPaid ? new Date().toISOString() : null, mpId]);
            }
            else {
                // Update entire monthly payment
                await client.query(`UPDATE monthly_payments
           SET is_paid = $1, paid_at = $2
           WHERE id = $3`, [isPaid, isPaid ? new Date().toISOString() : null, mpId]);
                // Update all split payments
                await client.query(`UPDATE monthly_payment_splits
           SET is_paid = $1, paid_at = $2
           WHERE monthly_payment_id = $3`, [isPaid, isPaid ? new Date().toISOString() : null, mpId]);
            }
        }
        await client.query('COMMIT');
        // Fetch updated expense
        const expenseResult = await (0, database_1.query)('SELECT * FROM expenses WHERE id = $1', [id]);
        const splitsResult = await (0, database_1.query)('SELECT * FROM expense_splits WHERE expense_id = $1', [id]);
        const monthlyPaymentsResult = await (0, database_1.query)('SELECT * FROM monthly_payments WHERE expense_id = $1', [id]);
        const monthlyPaymentIds = monthlyPaymentsResult.rows.map((mp) => mp.id);
        let monthlyPaymentSplitsResult = { rows: [] };
        if (monthlyPaymentIds.length > 0) {
            monthlyPaymentSplitsResult = await (0, database_1.query)('SELECT * FROM monthly_payment_splits WHERE monthly_payment_id = ANY($1)', [monthlyPaymentIds]);
        }
        const updatedExpense = rowToExpense(expenseResult.rows[0], splitsResult.rows, monthlyPaymentsResult.rows, monthlyPaymentSplitsResult.rows);
        res.json({
            success: true,
            data: updatedExpense,
        });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error marking monthly payment:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update monthly payment',
        });
    }
    finally {
        client.release();
    }
};
exports.markMonthlyPayment = markMonthlyPayment;
//# sourceMappingURL=expensesController.js.map