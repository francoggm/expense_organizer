-- Expense Organizer Database Schema
-- PostgreSQL

-- Drop tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS monthly_payment_splits CASCADE;
DROP TABLE IF EXISTS monthly_payments CASCADE;
DROP TABLE IF EXISTS expense_splits CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS people CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS settings CASCADE;

-- People table
CREATE TABLE people (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    color VARCHAR(7) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE categories (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(50) NOT NULL,
    color VARCHAR(7) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('fixed', 'variable', 'both'))
);

-- Expenses table
CREATE TABLE expenses (
    id VARCHAR(36) PRIMARY KEY,
    description VARCHAR(500) NOT NULL,
    category VARCHAR(255) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('fixed', 'variable')),
    total_amount DECIMAL(12, 2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'credit', 'debit', 'pix', 'transfer')),
    installments INTEGER DEFAULT 1,
    current_installment INTEGER DEFAULT 1,
    installment_group_id VARCHAR(36),
    due_day INTEGER CHECK (due_day >= 1 AND due_day <= 31),
    due_date DATE,
    paid_by_id VARCHAR(36) NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    status VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
    is_recurring BOOLEAN DEFAULT FALSE,
    is_variable_amount BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP WITH TIME ZONE
);

-- Expense splits table (for shared expenses)
CREATE TABLE expense_splits (
    id VARCHAR(36) PRIMARY KEY,
    expense_id VARCHAR(36) NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    person_id VARCHAR(36) NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    percentage DECIMAL(5, 2) NOT NULL,
    is_paid BOOLEAN DEFAULT FALSE,
    paid_at TIMESTAMP WITH TIME ZONE
);

-- Monthly payments table (for recurring fixed expenses)
CREATE TABLE monthly_payments (
    id VARCHAR(36) PRIMARY KEY,
    expense_id VARCHAR(36) NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    is_paid BOOLEAN DEFAULT FALSE,
    paid_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(expense_id, month, year)
);

-- Monthly payment splits table (for shared recurring expenses)
CREATE TABLE monthly_payment_splits (
    id VARCHAR(36) PRIMARY KEY,
    monthly_payment_id VARCHAR(36) NOT NULL REFERENCES monthly_payments(id) ON DELETE CASCADE,
    person_id VARCHAR(36) NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    is_paid BOOLEAN DEFAULT FALSE,
    paid_at TIMESTAMP WITH TIME ZONE
);

-- Settings table
CREATE TABLE settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    theme VARCHAR(10) NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    currency VARCHAR(10) NOT NULL DEFAULT 'BRL',
    locale VARCHAR(10) NOT NULL DEFAULT 'pt-BR',
    CONSTRAINT single_row CHECK (id = 1)
);

-- Create indexes for better query performance
CREATE INDEX idx_expenses_paid_by_id ON expenses(paid_by_id);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_type ON expenses(type);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_expenses_created_at ON expenses(created_at);
CREATE INDEX idx_expenses_installment_group_id ON expenses(installment_group_id);
CREATE INDEX idx_expense_splits_expense_id ON expense_splits(expense_id);
CREATE INDEX idx_expense_splits_person_id ON expense_splits(person_id);
CREATE INDEX idx_monthly_payments_expense_id ON monthly_payments(expense_id);
CREATE INDEX idx_monthly_payments_month_year ON monthly_payments(month, year);
CREATE INDEX idx_monthly_payment_splits_monthly_payment_id ON monthly_payment_splits(monthly_payment_id);
CREATE INDEX idx_monthly_payment_splits_person_id ON monthly_payment_splits(person_id);

-- Insert default categories
INSERT INTO categories (id, name, icon, color, type) VALUES
    ('1', 'Moradia', 'Home', '#4CAF50', 'fixed'),
    ('2', 'Água', 'Water', '#2196F3', 'fixed'),
    ('3', 'Luz', 'ElectricBolt', '#FF9800', 'fixed'),
    ('4', 'Internet', 'Wifi', '#9C27B0', 'fixed'),
    ('5', 'Telefone', 'Phone', '#00BCD4', 'fixed'),
    ('6', 'Seguro', 'Security', '#607D8B', 'fixed'),
    ('7', 'Assinaturas', 'Subscriptions', '#E91E63', 'fixed'),
    ('8', 'Alimentação', 'ShoppingCart', '#8BC34A', 'variable'),
    ('9', 'Restaurante', 'Restaurant', '#FF5722', 'variable'),
    ('10', 'Transporte', 'DirectionsCar', '#00BCD4', 'both'),
    ('11', 'Entretenimento', 'Movie', '#673AB7', 'variable'),
    ('12', 'Compras', 'ShoppingBag', '#F44336', 'variable'),
    ('13', 'Saúde', 'LocalHospital', '#4DD0E1', 'both'),
    ('14', 'Educação', 'School', '#3F51B5', 'both'),
    ('15', 'Viagem', 'Flight', '#FFEB3B', 'variable'),
    ('16', 'Cuidados Pessoais', 'Spa', '#E1BEE7', 'variable'),
    ('17', 'Presentes', 'CardGiftcard', '#FF4081', 'variable'),
    ('18', 'Outros', 'MoreHoriz', '#9E9E9E', 'both');

-- Insert default settings
INSERT INTO settings (id, theme, currency, locale) VALUES (1, 'system', 'BRL', 'pt-BR');

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_user;