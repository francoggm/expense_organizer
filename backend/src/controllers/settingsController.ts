import { Request, Response } from 'express';
import { query, getClient } from '../config/database';
import type { AppSettings, SettingsRow, BackupData, ApiResponse, Person, Expense, Category } from '../models/types';

// Default settings
const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  currency: 'BRL',
  locale: 'pt-BR',
};

// Convert database row to AppSettings object
const rowToSettings = (row: SettingsRow): AppSettings => ({
  theme: row.theme,
  currency: row.currency,
  locale: row.locale,
});

// Get settings
export const get = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query('SELECT * FROM settings WHERE id = 1');

    if (result.rows.length === 0) {
      // Insert default settings if not exists
      await query(
        `INSERT INTO settings (id, theme, currency, locale)
         VALUES (1, $1, $2, $3)`,
        [DEFAULT_SETTINGS.theme, DEFAULT_SETTINGS.currency, DEFAULT_SETTINGS.locale]
      );
      res.json({
        success: true,
        data: DEFAULT_SETTINGS,
      } as ApiResponse<AppSettings>);
      return;
    }

    res.json({
      success: true,
      data: rowToSettings(result.rows[0]),
    } as ApiResponse<AppSettings>);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch settings',
    } as ApiResponse);
  }
};

// Update settings
export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const { theme, currency, locale } = req.body as AppSettings;

    // Check if settings exist
    const existsResult = await query('SELECT id FROM settings WHERE id = 1');

    let result;
    if (existsResult.rows.length === 0) {
      // Insert new settings
      result = await query(
        `INSERT INTO settings (id, theme, currency, locale)
         VALUES (1, $1, $2, $3)
         RETURNING *`,
        [theme || DEFAULT_SETTINGS.theme, currency || DEFAULT_SETTINGS.currency, locale || DEFAULT_SETTINGS.locale]
      );
    } else {
      // Update existing settings
      result = await query(
        `UPDATE settings
         SET theme = $1, currency = $2, locale = $3
         WHERE id = 1
         RETURNING *`,
        [theme || DEFAULT_SETTINGS.theme, currency || DEFAULT_SETTINGS.currency, locale || DEFAULT_SETTINGS.locale]
      );
    }

    res.json({
      success: true,
      data: rowToSettings(result.rows[0]),
    } as ApiResponse<AppSettings>);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update settings',
    } as ApiResponse);
  }
};

// Export all data (backup)
export const exportData = async (_req: Request, res: Response): Promise<void> => {
  try {
    const peopleResult = await query('SELECT * FROM people ORDER BY created_at ASC');
    const expensesResult = await query('SELECT * FROM expenses ORDER BY created_at DESC');
    const splitsResult = await query('SELECT * FROM expense_splits');
    const monthlyPaymentsResult = await query('SELECT * FROM monthly_payments');
    const monthlyPaymentSplitsResult = await query('SELECT * FROM monthly_payment_splits');
    const categoriesResult = await query('SELECT * FROM categories ORDER BY name ASC');
    const settingsResult = await query('SELECT * FROM settings WHERE id = 1');

    // Convert people
    const people: Person[] = peopleResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email || undefined,
      color: row.color,
      createdAt: row.created_at.toISOString(),
    }));

    // Convert expenses with their relations
    const expenses: Expense[] = expensesResult.rows.map((row) => {
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
    const categories: Category[] = categoriesResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      icon: row.icon,
      color: row.color,
      type: row.type,
    }));

    // Convert settings
    const settings: AppSettings = settingsResult.rows.length > 0
      ? rowToSettings(settingsResult.rows[0])
      : DEFAULT_SETTINGS;

    const backupData: BackupData = {
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
    } as ApiResponse<BackupData>);
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export data',
    } as ApiResponse);
  }
};

// Import data (restore backup)
export const importData = async (req: Request, res: Response): Promise<void> => {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const backupData = req.body as BackupData;

    // Clear existing data (in reverse order of dependencies)
    await client.query('DELETE FROM monthly_payment_splits');
    await client.query('DELETE FROM monthly_payments');
    await client.query('DELETE FROM expense_splits');
    await client.query('DELETE FROM expenses');
    await client.query('DELETE FROM people');
    await client.query('DELETE FROM categories');

    // Import people
    for (const person of backupData.people || []) {
      await client.query(
        `INSERT INTO people (id, name, email, color, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [person.id, person.name, person.email || null, person.color, person.createdAt]
      );
    }

    // Import categories
    for (const category of backupData.categories || []) {
      await client.query(
        `INSERT INTO categories (id, name, icon, color, type)
         VALUES ($1, $2, $3, $4, $5)`,
        [category.id, category.name, category.icon, category.color, category.type]
      );
    }

    // Import expenses with their relations
    for (const expense of backupData.expenses || []) {
      await client.query(
        `INSERT INTO expenses (
          id, description, category, type, total_amount, payment_method,
          installments, current_installment, installment_group_id,
          due_day, due_date, paid_by_id, status, is_recurring,
          is_variable_amount, notes, created_at, paid_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
        [
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
        ]
      );

      // Import splits
      for (const split of expense.splitBetween || []) {
        const { v4: uuidv4 } = await import('uuid');
        await client.query(
          `INSERT INTO expense_splits (id, expense_id, person_id, amount, percentage, is_paid, paid_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            uuidv4(),
            expense.id,
            split.personId,
            split.amount,
            split.percentage,
            split.isPaid || false,
            split.paidAt || null,
          ]
        );
      }

      // Import monthly payments
      for (const mp of expense.monthlyPayments || []) {
        const { v4: uuidv4 } = await import('uuid');
        const mpId = uuidv4();
        await client.query(
          `INSERT INTO monthly_payments (id, expense_id, month, year, is_paid, paid_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [mpId, expense.id, mp.month, mp.year, mp.isPaid || false, mp.paidAt || null]
        );

        // Import monthly payment splits
        for (const mps of mp.splitPayments || []) {
          await client.query(
            `INSERT INTO monthly_payment_splits (id, monthly_payment_id, person_id, is_paid, paid_at)
             VALUES ($1, $2, $3, $4, $5)`,
            [uuidv4(), mpId, mps.personId, mps.isPaid || false, mps.paidAt || null]
          );
        }
      }
    }

    // Import settings
    if (backupData.settings) {
      await client.query('DELETE FROM settings');
      await client.query(
        `INSERT INTO settings (id, theme, currency, locale)
         VALUES (1, $1, $2, $3)`,
        [backupData.settings.theme, backupData.settings.currency, backupData.settings.locale]
      );
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Data imported successfully',
    } as ApiResponse);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error importing data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import data',
    } as ApiResponse);
  } finally {
    client.release();
  }
};

// Clear all data
export const clearAll = async (_req: Request, res: Response): Promise<void> => {
  const client = await getClient();

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
    } as ApiResponse);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error clearing data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear data',
    } as ApiResponse);
  } finally {
    client.release();
  }
};