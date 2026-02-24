import type { Person, Expense, Category, AppSettings } from '../types';

const STORAGE_KEYS = {
  PEOPLE: 'expense_organizer_people',
  EXPENSES: 'expense_organizer_expenses',
  CATEGORIES: 'expense_organizer_categories',
  SETTINGS: 'expense_organizer_settings',
};

// Default categories in Portuguese
const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', name: 'Moradia', icon: 'Home', color: '#4CAF50', type: 'fixed' },
  { id: '2', name: 'Água', icon: 'Water', color: '#2196F3', type: 'fixed' },
  { id: '3', name: 'Luz', icon: 'ElectricBolt', color: '#FF9800', type: 'fixed' },
  { id: '4', name: 'Internet', icon: 'Wifi', color: '#9C27B0', type: 'fixed' },
  { id: '5', name: 'Telefone', icon: 'Phone', color: '#00BCD4', type: 'fixed' },
  { id: '6', name: 'Seguro', icon: 'Security', color: '#607D8B', type: 'fixed' },
  { id: '7', name: 'Assinaturas', icon: 'Subscriptions', color: '#E91E63', type: 'fixed' },
  { id: '8', name: 'Alimentação', icon: 'ShoppingCart', color: '#8BC34A', type: 'variable' },
  { id: '9', name: 'Restaurante', icon: 'Restaurant', color: '#FF5722', type: 'variable' },
  { id: '10', name: 'Transporte', icon: 'DirectionsCar', color: '#00BCD4', type: 'both' },
  { id: '11', name: 'Entretenimento', icon: 'Movie', color: '#673AB7', type: 'variable' },
  { id: '12', name: 'Compras', icon: 'ShoppingBag', color: '#F44336', type: 'variable' },
  { id: '13', name: 'Saúde', icon: 'LocalHospital', color: '#4DD0E1', type: 'both' },
  { id: '14', name: 'Educação', icon: 'School', color: '#3F51B5', type: 'both' },
  { id: '15', name: 'Viagem', icon: 'Flight', color: '#FFEB3B', type: 'variable' },
  { id: '16', name: 'Cuidados Pessoais', icon: 'Spa', color: '#E1BEE7', type: 'variable' },
  { id: '17', name: 'Presentes', icon: 'CardGiftcard', color: '#FF4081', type: 'variable' },
  { id: '18', name: 'Outros', icon: 'MoreHoriz', color: '#9E9E9E', type: 'both' },
];

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  currency: 'BRL',
  locale: 'pt-BR',
  defaultCategories: DEFAULT_CATEGORIES,
};

// Generic storage functions
function getItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing ${key} to localStorage:`, error);
  }
}

// People
export function getPeople(): Person[] {
  return getItem<Person[]>(STORAGE_KEYS.PEOPLE, []);
}

export function savePeople(people: Person[]): void {
  setItem(STORAGE_KEYS.PEOPLE, people);
}

export function addPerson(person: Person): void {
  const people = getPeople();
  people.push(person);
  savePeople(people);
}

export function updatePerson(person: Person): void {
  const people = getPeople();
  const index = people.findIndex((p) => p.id === person.id);
  if (index !== -1) {
    people[index] = person;
    savePeople(people);
  }
}

export function deletePerson(id: string): void {
  const people = getPeople();
  savePeople(people.filter((p) => p.id !== id));
}

// Expenses
export function getExpenses(): Expense[] {
  return getItem<Expense[]>(STORAGE_KEYS.EXPENSES, []);
}

export function saveExpenses(expenses: Expense[]): void {
  setItem(STORAGE_KEYS.EXPENSES, expenses);
}

export function addExpense(expense: Expense): void {
  const expenses = getExpenses();
  expenses.push(expense);
  saveExpenses(expenses);
}

export function addExpenses(newExpenses: Expense[]): void {
  const expenses = getExpenses();
  expenses.push(...newExpenses);
  saveExpenses(expenses);
}

export function updateExpense(expense: Expense): void {
  const expenses = getExpenses();
  const index = expenses.findIndex((e) => e.id === expense.id);
  if (index !== -1) {
    expenses[index] = expense;
    saveExpenses(expenses);
  }
}

export function deleteExpense(id: string): void {
  const expenses = getExpenses();
  saveExpenses(expenses.filter((e) => e.id !== id));
}

export function deleteExpensesByGroupId(groupId: string): void {
  const expenses = getExpenses();
  saveExpenses(expenses.filter((e) => e.installmentGroupId !== groupId));
}

// Categories
export function getCategories(): Category[] {
  return getItem<Category[]>(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
}

export function saveCategories(categories: Category[]): void {
  setItem(STORAGE_KEYS.CATEGORIES, categories);
}

export function addCategory(category: Category): void {
  const categories = getCategories();
  categories.push(category);
  saveCategories(categories);
}

export function updateCategory(category: Category): void {
  const categories = getCategories();
  const index = categories.findIndex((c) => c.id === category.id);
  if (index !== -1) {
    categories[index] = category;
    saveCategories(categories);
  }
}

export function deleteCategory(id: string): void {
  const categories = getCategories();
  saveCategories(categories.filter((c) => c.id !== id));
}

export function resetCategories(): void {
  saveCategories(DEFAULT_CATEGORIES);
}

// Settings
export function getSettings(): AppSettings {
  return getItem<AppSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
}

export function saveSettings(settings: AppSettings): void {
  setItem(STORAGE_KEYS.SETTINGS, settings);
}

// Backup & Restore
export interface BackupData {
  people: Person[];
  expenses: Expense[];
  categories: Category[];
  settings: AppSettings;
  exportedAt: string;
  version: string;
}

export function exportData(): BackupData {
  return {
    people: getPeople(),
    expenses: getExpenses(),
    categories: getCategories(),
    settings: getSettings(),
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
  };
}

export function importData(data: BackupData): void {
  if (data.people) savePeople(data.people);
  if (data.expenses) saveExpenses(data.expenses);
  if (data.categories) saveCategories(data.categories);
  if (data.settings) saveSettings(data.settings);
}

export function clearAllData(): void {
  localStorage.removeItem(STORAGE_KEYS.PEOPLE);
  localStorage.removeItem(STORAGE_KEYS.EXPENSES);
  localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
  localStorage.removeItem(STORAGE_KEYS.SETTINGS);
}