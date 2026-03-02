import { format, parseISO, isAfter, isBefore, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import type { Expense, Person, Balance, SplitInfo } from '../types';

// Currency formatting
export function formatCurrency(amount: number, currency = 'BRL', locale = 'pt-BR'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

// Date formatting
export function formatDate(date: string | Date, formatStr = 'dd/MM/yyyy'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr);
}

export function formatDateShort(date: string | Date): string {
  return formatDate(date, 'dd/MM/yyyy');
}

export function formatMonthYear(date: string | Date): string {
  return formatDate(date, 'MMMM yyyy');
}

// Format day of month
export function formatDueDay(day: number): string {
  return `Dia ${day}`;
}

// Get current month range
export function getCurrentMonthRange(): { start: Date; end: Date } {
  const now = new Date();
  return {
    start: startOfMonth(now),
    end: endOfMonth(now),
  };
}

// Get month range for a specific date
export function getMonthRange(date: Date): { start: Date; end: Date } {
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  };
}

// Get due date for a recurring expense (using dueDay)
export function getDueDateForMonth(dueDay: number, year: number, month: number): Date {
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const day = Math.min(dueDay, lastDayOfMonth);
  return new Date(year, month, day);
}

// Check if expense is overdue
export function isExpenseOverdue(expense: Expense, month?: number, year?: number): boolean {
  // For recurring expenses, check monthlyPayments
  if (expense.isRecurring && expense.monthlyPayments && month !== undefined && year !== undefined) {
    const monthlyPayment = expense.monthlyPayments.find(
      (mp) => mp.month === month && mp.year === year
    );
    if (monthlyPayment?.isPaid) return false;
  } else if (expense.status === 'paid') {
    return false;
  }
  
  if (expense.dueDate) {
    const dueDate = parseISO(expense.dueDate);
    return isBefore(dueDate, new Date());
  }
  
  if (expense.dueDay) {
    const now = new Date();
    const checkMonth = month !== undefined ? month : now.getMonth();
    const checkYear = year !== undefined ? year : now.getFullYear();
    const currentDueDate = getDueDateForMonth(expense.dueDay, checkYear, checkMonth);
    return isBefore(currentDueDate, now);
  }
  
  return false;
}

// Update expense status based on due date
export function getExpenseStatus(expense: Expense, month?: number, year?: number): 'pending' | 'paid' | 'overdue' {
  // For recurring expenses, check monthlyPayments for the specific month
  if (expense.isRecurring && month !== undefined && year !== undefined) {
    const monthlyPayment = expense.monthlyPayments?.find(
      (mp) => mp.month === month && mp.year === year
    );
    if (monthlyPayment?.isPaid) return 'paid';
    return isExpenseOverdue(expense, month, year) ? 'overdue' : 'pending';
  }
  
  if (expense.status === 'paid') return 'paid';
  return isExpenseOverdue(expense, month, year) ? 'overdue' : 'pending';
}

// Calculate installment amount
export function calculateInstallmentAmount(totalAmount: number, installments: number): number {
  return totalAmount / installments;
}

// Generate installment dates
export function generateInstallmentDates(startDate: Date, installments: number): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < installments; i++) {
    dates.push(addMonths(startDate, i));
  }
  return dates;
}

// Calculate split amounts
export function calculateSplitAmounts(
  totalAmount: number,
  splits: { personId: string; percentage: number }[]
): SplitInfo[] {
  return splits.map((split) => ({
    personId: split.personId,
    percentage: split.percentage,
    amount: (totalAmount * split.percentage) / 100,
    isPaid: false,
  }));
}

// Calculate balances between people
export function calculateBalances(expenses: Expense[], people: Person[]): Balance[] {
  const balances: Map<string, number> = new Map();

  // Initialize balances for all person pairs
  for (const person1 of people) {
    for (const person2 of people) {
      if (person1.id !== person2.id) {
        balances.set(`${person1.id}-${person2.id}`, 0);
      }
    }
  }

  // Calculate balances from expenses
  for (const expense of expenses) {
    const paidById = expense.paidById;
    
    for (const split of expense.splitBetween) {
      if (split.personId !== paidById && !split.isPaid) {
        // This person owes money to the payer
        const key = `${split.personId}-${paidById}`;
        const currentBalance = balances.get(key) || 0;
        balances.set(key, currentBalance + split.amount);
      }
    }
  }

  // Convert to Balance array and simplify (net out mutual debts)
  const result: Balance[] = [];
  const processed = new Set<string>();

  for (const [key, amount] of balances) {
    if (processed.has(key) || amount === 0) continue;

    const [fromId, toId] = key.split('-');
    const reverseKey = `${toId}-${fromId}`;
    const reverseAmount = balances.get(reverseKey) || 0;

    processed.add(key);
    processed.add(reverseKey);

    const netAmount = amount - reverseAmount;

    if (netAmount > 0) {
      result.push({
        fromPersonId: fromId,
        toPersonId: toId,
        amount: netAmount,
      });
    } else if (netAmount < 0) {
      result.push({
        fromPersonId: toId,
        toPersonId: fromId,
        amount: Math.abs(netAmount),
      });
    }
  }

  return result.filter((b) => b.amount > 0);
}

// Filter expenses by date range
export function filterExpensesByDateRange(
  expenses: Expense[],
  startDate: Date,
  endDate: Date
): Expense[] {
  return expenses.filter((expense) => {
    if (!expense.dueDate) return false;
    const dueDate = parseISO(expense.dueDate);
    return !isBefore(dueDate, startDate) && !isAfter(dueDate, endDate);
  });
}

// Group expenses by category
export function groupExpensesByCategory(
  expenses: Expense[]
): Map<string, { total: number; count: number }> {
  const groups = new Map<string, { total: number; count: number }>();

  for (const expense of expenses) {
    const current = groups.get(expense.category) || { total: 0, count: 0 };
    groups.set(expense.category, {
      total: current.total + expense.totalAmount,
      count: current.count + 1,
    });
  }

  return groups;
}

// Group expenses by person
export function groupExpensesByPerson(
  expenses: Expense[]
): Map<string, { total: number; count: number }> {
  const groups = new Map<string, { total: number; count: number }>();

  for (const expense of expenses) {
    const current = groups.get(expense.paidById) || { total: 0, count: 0 };
    groups.set(expense.paidById, {
      total: current.total + expense.totalAmount,
      count: current.count + 1,
    });
  }

  return groups;
}

// Calculate total expenses
export function calculateTotalExpenses(expenses: Expense[]): number {
  return expenses.reduce((sum, expense) => sum + expense.totalAmount, 0);
}

// Calculate total by status
export function calculateTotalByStatus(
  expenses: Expense[],
  month?: number,
  year?: number
): { pending: number; paid: number; overdue: number } {
  // Use current month/year if not provided
  const now = new Date();
  const checkMonth = month !== undefined ? month : now.getMonth();
  const checkYear = year !== undefined ? year : now.getFullYear();
  
  return expenses.reduce(
    (acc, expense) => {
      const status = getExpenseStatus(expense, checkMonth, checkYear);
      acc[status] += expense.totalAmount;
      return acc;
    },
    { pending: 0, paid: 0, overdue: 0 }
  );
}

// Generate random color
export function generateRandomColor(): string {
  const colors = [
    '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
    '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50',
    '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800',
    '#FF5722', '#795548', '#607D8B',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Predefined colors for selection
export const DEFAULT_CATEGORIES = [
  { name: 'Moradia', color: '#2196F3', icon: 'home', type: 'fixed' as const },
  { name: 'Utilidades', color: '#4CAF50', icon: 'bolt', type: 'fixed' as const },
  { name: 'Alimentação', color: '#FF9800', icon: 'restaurant', type: 'variable' as const },
  { name: 'Transporte', color: '#9C27B0', icon: 'directions_car', type: 'variable' as const },
  { name: 'Entretenimento', color: '#E91E63', icon: 'movie', type: 'variable' as const },
  { name: 'Compras', color: '#00BCD4', icon: 'shopping_bag', type: 'variable' as const },
  { name: 'Saúde', color: '#F44336', icon: 'medical_services', type: 'fixed' as const },
  { name: 'Educação', color: '#3F51B5', icon: 'school', type: 'variable' as const },
  { name: 'Assinaturas', color: '#607D8B', icon: 'subscriptions', type: 'fixed' as const },
  { name: 'Outros', color: '#9E9E9E', icon: 'more_horiz', type: 'variable' as const },
];

export const PRESET_COLORS = [
  '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
  '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50',
  '#8BC34A', '#CDDC39', '#FFC107', '#FF9800', '#FF5722',
  '#795548', '#607D8B', '#000000',
];

// Payment method labels
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Dinheiro',
  credit: 'Crédito',
  debit: 'Débito',
  pix: 'PIX',
  transfer: 'Transferência',
};

// Status labels and colors
export const STATUS_CONFIG = {
  pending: { label: 'Pendente', color: '#FF9800' },
  paid: { label: 'Pago', color: '#4CAF50' },
  overdue: { label: 'Vencido', color: '#F44336' },
};

// Expense type labels
export const EXPENSE_TYPE_LABELS = {
  fixed: 'Fixa',
  variable: 'Variável',
};

// Validate email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Truncate text
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

// Sort expenses by date
export function sortExpensesByDate(expenses: Expense[], ascending = true): Expense[] {
  return [...expenses].sort((a, b) => {
    const dateA = a.dueDate ? parseISO(a.dueDate).getTime() : (a.dueDay || 0);
    const dateB = b.dueDate ? parseISO(b.dueDate).getTime() : (b.dueDay || 0);
    return ascending ? dateA - dateB : dateB - dateA;
  });
}

// Get upcoming expenses (next 7 days)
export function getUpcomingExpenses(expenses: Expense[], days = 7): Expense[] {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  return expenses.filter((expense) => {
    if (expense.status === 'paid') return false;
    
    if (expense.dueDate) {
      const dueDate = parseISO(expense.dueDate);
      return !isBefore(dueDate, now) && !isAfter(dueDate, futureDate);
    }
    
    if (expense.dueDay) {
      const currentDueDate = getDueDateForMonth(expense.dueDay, now.getFullYear(), now.getMonth());
      return !isBefore(currentDueDate, now) && !isAfter(currentDueDate, futureDate);
    }
    
    return false;
  });
}

// Get display date for expense
export function getExpenseDisplayDate(expense: Expense): string {
  if (expense.dueDate) {
    return formatDate(expense.dueDate);
  }
  if (expense.dueDay) {
    return formatDueDay(expense.dueDay);
  }
  return '-';
}