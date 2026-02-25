// Person type - represents a user of the application
export interface Person {
  id: string;
  name: string;
  email?: string;
  color: string; // Color for visual identification in charts and UI
  createdAt: string;
}

// Split information for shared expenses
export interface SplitInfo {
  personId: string;
  amount: number;
  percentage: number;
  isPaid: boolean; // Individual payment status for each person
  paidAt?: string; // When this person paid their share
}

// Monthly payment record for recurring fixed expenses
export interface MonthlyPayment {
  month: number; // 0-11 (January = 0)
  year: number;
  isPaid: boolean;
  paidAt?: string;
  splitPayments?: { personId: string; isPaid: boolean; paidAt?: string }[];
}

// Expense type
export interface Expense {
  id: string;
  description: string;
  category: string;
  type: 'fixed' | 'variable'; // Fixed = recurring bills, Variable = one-time purchases
  totalAmount: number;
  paymentMethod: 'cash' | 'credit' | 'debit' | 'pix' | 'transfer';
  installments: number; // 1 = one-time payment, >1 = installments (only for credit)
  currentInstallment: number; // Which installment this is (1-based)
  installmentGroupId?: string; // Groups all installments of the same purchase
  // For fixed recurring expenses: only day of month (1-31)
  // For variable expenses: full date
  dueDay?: number; // Day of month for recurring fixed expenses (1-31)
  dueDate?: string; // ISO date string for variable expenses or specific due date
  paidById: string; // Person who made the payment
  splitBetween: SplitInfo[]; // How the expense is split between people
  status: 'pending' | 'paid' | 'overdue';
  isRecurring: boolean; // For fixed bills that repeat monthly
  // For fixed expenses that can vary in value (like electricity, water)
  isVariableAmount: boolean;
  notes?: string;
  createdAt: string;
  paidAt?: string;
  // For recurring fixed expenses: track payments per month
  monthlyPayments?: MonthlyPayment[];
}

// Category type for expense categorization
export interface Category {
  id: string;
  name: string;
  icon: string; // MUI icon name
  color: string;
  type: 'fixed' | 'variable' | 'both';
}

// App settings
export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  currency: string;
  locale: string;
  defaultCategories: Category[];
}

// Dashboard summary data
export interface DashboardSummary {
  totalExpenses: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  expensesByCategory: { category: string; amount: number; color: string }[];
  expensesByPerson: { personId: string; personName: string; amount: number; color: string }[];
  monthlyTrend: { month: string; amount: number }[];
}

// Balance between people (who owes whom)
export interface Balance {
  fromPersonId: string;
  toPersonId: string;
  amount: number;
}

// Filter options for expense list
export interface ExpenseFilters {
  startDate?: string;
  endDate?: string;
  personId?: string;
  category?: string;
  type?: 'fixed' | 'variable';
  status?: 'pending' | 'paid' | 'overdue';
  paymentMethod?: string;
}

// Form data types for creating/editing
export interface ExpenseFormData {
  description: string;
  category: string;
  type: 'fixed' | 'variable';
  totalAmount: number;
  paymentMethod: 'cash' | 'credit' | 'debit' | 'pix' | 'transfer';
  installments: number;
  dueDay?: number; // For recurring fixed expenses
  dueDate?: string; // For variable expenses
  paidById: string;
  splitBetween: { personId: string; percentage: number }[];
  isRecurring: boolean;
  isVariableAmount: boolean;
  notes?: string;
}

export interface PersonFormData {
  name: string;
  email?: string;
  color: string;
}