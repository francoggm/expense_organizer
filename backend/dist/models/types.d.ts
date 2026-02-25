export interface Person {
    id: string;
    name: string;
    email?: string;
    color: string;
    createdAt: string;
}
export interface PersonRow {
    id: string;
    name: string;
    email: string | null;
    color: string;
    created_at: Date;
}
export interface SplitInfo {
    personId: string;
    amount: number;
    percentage: number;
    isPaid: boolean;
    paidAt?: string;
}
export interface ExpenseSplitRow {
    id: string;
    expense_id: string;
    person_id: string;
    amount: string;
    percentage: string;
    is_paid: boolean;
    paid_at: Date | null;
}
export interface MonthlyPayment {
    month: number;
    year: number;
    isPaid: boolean;
    paidAt?: string;
    splitPayments?: {
        personId: string;
        isPaid: boolean;
        paidAt?: string;
    }[];
}
export interface MonthlyPaymentRow {
    id: string;
    expense_id: string;
    month: number;
    year: number;
    is_paid: boolean;
    paid_at: Date | null;
}
export interface MonthlyPaymentSplitRow {
    id: string;
    monthly_payment_id: string;
    person_id: string;
    is_paid: boolean;
    paid_at: Date | null;
}
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
export interface Category {
    id: string;
    name: string;
    icon: string;
    color: string;
    type: 'fixed' | 'variable' | 'both';
}
export interface CategoryRow {
    id: string;
    name: string;
    icon: string;
    color: string;
    type: 'fixed' | 'variable' | 'both';
}
export interface AppSettings {
    theme: 'light' | 'dark' | 'system';
    currency: string;
    locale: string;
}
export interface SettingsRow {
    id: number;
    theme: 'light' | 'dark' | 'system';
    currency: string;
    locale: string;
}
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
    splitBetween: {
        personId: string;
        percentage: number;
    }[];
    isRecurring: boolean;
    isVariableAmount: boolean;
    notes?: string;
}
export interface PersonFormData {
    name: string;
    email?: string;
    color: string;
}
export interface BackupData {
    people: Person[];
    expenses: Expense[];
    categories: Category[];
    settings: AppSettings;
    exportedAt: string;
    version: string;
}
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
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
//# sourceMappingURL=types.d.ts.map