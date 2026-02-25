// Person type - represents a user of the application
export interface Person {
  id: string;
  name: string;
  email?: string;
  color: string;
  createdAt: string;
}

// Database row for Person
export interface PersonRow {
  id: string;
  name: string;
  email: string | null;
  color: string;
  created_at: Date;
}

// Split information for shared expenses
export interface SplitInfo {
  personId: string;
  amount: number;
  percentage: number;
  isPaid: boolean;
  paidAt?: string;
}

// Database row for expense split
export interface ExpenseSplitRow {
  id: string;
  expense_id: string;
  person_id: string;
  amount: string;
  percentage: string;
  is_paid: boolean;
  paid_at: Date | null;
}

// Monthly payment record for recurring fixed expenses
export interface MonthlyPayment {
  month: number;
  year: number;
  isPaid: boolean;
  paidAt?: string;
  splitPayments?: { personId: string; isPaid: boolean; paidAt?: string }[];
}

// Database row for monthly payment
export interface MonthlyPaymentRow {
  id: string;
  expense_id: string;
  month: number;
  year: number;
  is_paid: boolean;
  paid_at: Date | null;
}

// Database row for monthly payment split
export interface MonthlyPaymentSplitRow {
  id: string;
  monthly_payment_id: string;
  person_id: string;
  is_paid: boolean;
  paid_at: Date | null;
}

// Expense type
export interface Expense {
  id: string;
  description: string;
  category: string;
  type: 'fixed' | 'variable';
  totalAmount: number;
  paymentMethod: 'cash' | 'credit' | 'debit' | 'pix' | 'transfer';
  installments: number;
  currentInstallment: number;
  installmentGroupId?: string;
  dueDay?: number;
  dueDate?: string;
  paidById: string;
  splitBetween: SplitInfo[];
  status: 'pending' | 'paid' | 'overdue';
  isRecurring: boolean;
  isVariableAmount: boolean;
  notes?: string;
  createdAt: string;
  paidAt?: string;
  monthlyPayments?: MonthlyPayment[];
}

// Database row for Expense
export interface ExpenseRow {
  id: string;
  description: string;
  category: string;
  type: 'fixed' | 'variable';
  total_amount: string;
  payment_method: 'cash' | 'credit' | 'debit' | 'pix' | 'transfer';
  installments: number;
  current_installment: number;
  installment_group_id: string | null;
  due_day: number | null;
  due_date: Date | null;
  paid_by_id: string;
  status: 'pending' | 'paid' | 'overdue';
  is_recurring: boolean;
  is_variable_amount: boolean;
  notes: string | null;
  created_at: Date;
  paid_at: Date | null;
}

// Category type for expense categorization
export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'fixed' | 'variable' | 'both';
}

// Database row for Category
export interface CategoryRow {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'fixed' | 'variable' | 'both';
}

// App settings
export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  currency: string;
  locale: string;
}

// Database row for Settings
export interface SettingsRow {
  id: number;
  theme: 'light' | 'dark' | 'system';
  currency: string;
  locale: string;
}

// Form data types for creating/editing
export interface ExpenseFormData {
  description: string;
  category: string;
  type: 'fixed' | 'variable';
  totalAmount: number;
  paymentMethod: 'cash' | 'credit' | 'debit' | 'pix' | 'transfer';
  installments: number;
  dueDay?: number;
  dueDate?: string;
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

// Backup data structure
export interface BackupData {
  people: Person[];
  expenses: Expense[];
  categories: Category[];
  settings: AppSettings;
  exportedAt: string;
  version: string;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Auth types
export interface LoginRequest {
  password: string;
}

export interface LoginResponse {
  token: string;
  expiresIn: string;
}

export interface JwtPayload {
  authenticated: boolean;
  iat: number;
  exp: number;
}