import React, { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react';
import type { Person, Expense, Category, AppSettings, MonthlyPayment, BackupData } from '../types';
import { peopleApi, expensesApi, categoriesApi, settingsApi, backupApi } from '../services/api';

// State type
interface AppState {
  people: Person[];
  expenses: Expense[];
  categories: Category[];
  settings: AppSettings;
  isLoading: boolean;
  error: string | null;
}

// Action types
type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOAD_DATA'; payload: Omit<AppState, 'isLoading' | 'error'> }
  // People actions
  | { type: 'SET_PEOPLE'; payload: Person[] }
  | { type: 'ADD_PERSON'; payload: Person }
  | { type: 'UPDATE_PERSON'; payload: Person }
  | { type: 'DELETE_PERSON'; payload: string }
  // Expense actions
  | { type: 'SET_EXPENSES'; payload: Expense[] }
  | { type: 'ADD_EXPENSE'; payload: Expense }
  | { type: 'ADD_EXPENSES'; payload: Expense[] }
  | { type: 'UPDATE_EXPENSE'; payload: Expense }
  | { type: 'DELETE_EXPENSE'; payload: string }
  | { type: 'DELETE_EXPENSES_BY_GROUP'; payload: string }
  // Category actions
  | { type: 'SET_CATEGORIES'; payload: Category[] }
  | { type: 'ADD_CATEGORY'; payload: Category }
  | { type: 'UPDATE_CATEGORY'; payload: Category }
  | { type: 'DELETE_CATEGORY'; payload: string }
  // Settings actions
  | { type: 'UPDATE_SETTINGS'; payload: AppSettings }
  // Data management
  | { type: 'CLEAR_ALL_DATA' };

// Default settings
const defaultSettings: AppSettings = {
  theme: 'system',
  currency: 'BRL',
  locale: 'pt-BR',
  defaultCategories: [],
};

// Initial state
const initialState: AppState = {
  people: [],
  expenses: [],
  categories: [],
  settings: defaultSettings,
  isLoading: true,
  error: null,
};

// Reducer - only handles state updates, API calls are made in action creators
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };

    case 'LOAD_DATA':
      return { ...state, ...action.payload, isLoading: false, error: null };

    // People
    case 'SET_PEOPLE':
      return { ...state, people: action.payload };

    case 'ADD_PERSON': {
      if (state.people.some(p => p.id === action.payload.id)) {
        return state;
      }
      return { ...state, people: [...state.people, action.payload] };
    }

    case 'UPDATE_PERSON':
      return {
        ...state,
        people: state.people.map((p) =>
          p.id === action.payload.id ? action.payload : p
        ),
      };

    case 'DELETE_PERSON':
      return {
        ...state,
        people: state.people.filter((p) => p.id !== action.payload),
      };

    // Expenses
    case 'SET_EXPENSES':
      return { ...state, expenses: action.payload };

    case 'ADD_EXPENSE': {
      if (state.expenses.some(e => e.id === action.payload.id)) {
        return state;
      }
      return { ...state, expenses: [...state.expenses, action.payload] };
    }

    case 'ADD_EXPENSES': {
      const newExpensesToAdd = action.payload.filter(
        newExp => !state.expenses.some(e => e.id === newExp.id)
      );
      if (newExpensesToAdd.length === 0) {
        return state;
      }
      return { ...state, expenses: [...state.expenses, ...newExpensesToAdd] };
    }

    case 'UPDATE_EXPENSE':
      return {
        ...state,
        expenses: state.expenses.map((e) =>
          e.id === action.payload.id ? action.payload : e
        ),
      };

    case 'DELETE_EXPENSE':
      return {
        ...state,
        expenses: state.expenses.filter((e) => e.id !== action.payload),
      };

    case 'DELETE_EXPENSES_BY_GROUP':
      return {
        ...state,
        expenses: state.expenses.filter(
          (e) => e.installmentGroupId !== action.payload
        ),
      };

    // Categories
    case 'SET_CATEGORIES':
      return { ...state, categories: action.payload };

    case 'ADD_CATEGORY':
      return { ...state, categories: [...state.categories, action.payload] };

    case 'UPDATE_CATEGORY':
      return {
        ...state,
        categories: state.categories.map((c) =>
          c.id === action.payload.id ? action.payload : c
        ),
      };

    case 'DELETE_CATEGORY':
      return {
        ...state,
        categories: state.categories.filter((c) => c.id !== action.payload),
      };

    // Settings
    case 'UPDATE_SETTINGS':
      return { ...state, settings: action.payload };

    // Data management
    case 'CLEAR_ALL_DATA':
      return {
        ...initialState,
        isLoading: false,
      };

    default:
      return state;
  }
}

// Context
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  // API-backed action functions
  loadData: () => Promise<void>;
  addPerson: (person: Omit<Person, 'id' | 'createdAt'>) => Promise<Person | null>;
  updatePerson: (id: string, person: Omit<Person, 'id' | 'createdAt'>) => Promise<Person | null>;
  deletePerson: (id: string) => Promise<boolean>;
  addExpense: (expense: Expense) => Promise<Expense | null>;
  addExpenses: (expenses: Expense[]) => Promise<Expense[] | null>;
  updateExpense: (id: string, expense: Expense) => Promise<Expense | null>;
  deleteExpense: (id: string) => Promise<boolean>;
  deleteExpensesByGroup: (groupId: string) => Promise<boolean>;
  markSplitPaid: (expenseId: string, personId: string, isPaid: boolean) => Promise<Expense | null>;
  markMonthlyPayment: (expenseId: string, month: number, year: number, isPaid: boolean, personId?: string) => Promise<Expense | null>;
  addCategory: (category: Omit<Category, 'id'>) => Promise<Category | null>;
  updateCategory: (id: string, category: Omit<Category, 'id'>) => Promise<Category | null>;
  deleteCategory: (id: string) => Promise<boolean>;
  resetCategories: () => Promise<boolean>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<AppSettings | null>;
  importData: (data: BackupData) => Promise<boolean>;
  exportData: () => Promise<BackupData | null>;
  clearAllData: () => Promise<boolean>;
  // Helper functions
  getPersonById: (id: string) => Person | undefined;
  getCategoryByName: (name: string) => Category | undefined;
  getExpensesByMonth: (year: number, month: number) => Expense[];
  getExpensesByPerson: (personId: string) => Expense[];
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component
interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load all data from backend API
  const loadData = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const [peopleRes, expensesRes, categoriesRes, settingsRes] = await Promise.all([
        peopleApi.getAll(),
        expensesApi.getAll(),
        categoriesApi.getAll(),
        settingsApi.get(),
      ]);

      if (!peopleRes.success || !expensesRes.success || !categoriesRes.success || !settingsRes.success) {
        const errors = [
          !peopleRes.success && peopleRes.error,
          !expensesRes.success && expensesRes.error,
          !categoriesRes.success && categoriesRes.error,
          !settingsRes.success && settingsRes.error,
        ].filter(Boolean).join(', ');
        
        dispatch({ type: 'SET_ERROR', payload: errors || 'Failed to load data' });
        return;
      }

      dispatch({
        type: 'LOAD_DATA',
        payload: {
          people: peopleRes.data || [],
          expenses: expensesRes.data || [],
          categories: categoriesRes.data || [],
          settings: settingsRes.data || defaultSettings,
        },
      });
    } catch (error) {
      console.error('Error loading data:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to connect to server' });
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // People API actions
  const addPerson = useCallback(async (person: Omit<Person, 'id' | 'createdAt'>): Promise<Person | null> => {
    try {
      const response = await peopleApi.create(person);
      if (response.success && response.data) {
        dispatch({ type: 'ADD_PERSON', payload: response.data });
        return response.data;
      }
      console.error('Failed to add person:', response.error);
      return null;
    } catch (error) {
      console.error('Error adding person:', error);
      return null;
    }
  }, []);

  const updatePerson = useCallback(async (id: string, person: Omit<Person, 'id' | 'createdAt'>): Promise<Person | null> => {
    try {
      const response = await peopleApi.update(id, person);
      if (response.success && response.data) {
        dispatch({ type: 'UPDATE_PERSON', payload: response.data });
        return response.data;
      }
      console.error('Failed to update person:', response.error);
      return null;
    } catch (error) {
      console.error('Error updating person:', error);
      return null;
    }
  }, []);

  const deletePerson = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await peopleApi.delete(id);
      if (response.success) {
        dispatch({ type: 'DELETE_PERSON', payload: id });
        return true;
      }
      console.error('Failed to delete person:', response.error);
      return false;
    } catch (error) {
      console.error('Error deleting person:', error);
      return false;
    }
  }, []);

  // Expenses API actions
  const addExpense = useCallback(async (expense: Expense): Promise<Expense | null> => {
    try {
      const response = await expensesApi.create(expense);
      if (response.success && response.data) {
        dispatch({ type: 'ADD_EXPENSE', payload: response.data });
        return response.data;
      }
      console.error('Failed to add expense:', response.error);
      return null;
    } catch (error) {
      console.error('Error adding expense:', error);
      return null;
    }
  }, []);

  const addExpenses = useCallback(async (expenses: Expense[]): Promise<Expense[] | null> => {
    try {
      const response = await expensesApi.createBulk(expenses);
      if (response.success && response.data) {
        dispatch({ type: 'ADD_EXPENSES', payload: response.data });
        return response.data;
      }
      console.error('Failed to add expenses:', response.error);
      return null;
    } catch (error) {
      console.error('Error adding expenses:', error);
      return null;
    }
  }, []);

  const updateExpense = useCallback(async (id: string, expense: Expense): Promise<Expense | null> => {
    try {
      const response = await expensesApi.update(id, expense);
      if (response.success && response.data) {
        dispatch({ type: 'UPDATE_EXPENSE', payload: response.data });
        return response.data;
      }
      console.error('Failed to update expense:', response.error);
      return null;
    } catch (error) {
      console.error('Error updating expense:', error);
      return null;
    }
  }, []);

  const deleteExpense = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await expensesApi.delete(id);
      if (response.success) {
        dispatch({ type: 'DELETE_EXPENSE', payload: id });
        return true;
      }
      console.error('Failed to delete expense:', response.error);
      return false;
    } catch (error) {
      console.error('Error deleting expense:', error);
      return false;
    }
  }, []);

  const deleteExpensesByGroup = useCallback(async (groupId: string): Promise<boolean> => {
    try {
      const response = await expensesApi.deleteByGroup(groupId);
      if (response.success) {
        dispatch({ type: 'DELETE_EXPENSES_BY_GROUP', payload: groupId });
        return true;
      }
      console.error('Failed to delete expenses by group:', response.error);
      return false;
    } catch (error) {
      console.error('Error deleting expenses by group:', error);
      return false;
    }
  }, []);

  const markSplitPaid = useCallback(async (expenseId: string, personId: string, isPaid: boolean): Promise<Expense | null> => {
    try {
      const response = await expensesApi.markSplitPaid(expenseId, personId, isPaid);
      if (response.success && response.data) {
        dispatch({ type: 'UPDATE_EXPENSE', payload: response.data });
        return response.data;
      }
      console.error('Failed to mark split paid:', response.error);
      return null;
    } catch (error) {
      console.error('Error marking split paid:', error);
      return null;
    }
  }, []);

  const markMonthlyPayment = useCallback(async (
    expenseId: string,
    month: number,
    year: number,
    isPaid: boolean,
    personId?: string
  ): Promise<Expense | null> => {
    try {
      const response = await expensesApi.markMonthlyPayment(expenseId, month, year, isPaid, personId);
      if (response.success && response.data) {
        dispatch({ type: 'UPDATE_EXPENSE', payload: response.data });
        return response.data;
      }
      console.error('Failed to mark monthly payment:', response.error);
      return null;
    } catch (error) {
      console.error('Error marking monthly payment:', error);
      return null;
    }
  }, []);

  // Categories API actions
  const addCategory = useCallback(async (category: Omit<Category, 'id'>): Promise<Category | null> => {
    try {
      const response = await categoriesApi.create(category);
      if (response.success && response.data) {
        dispatch({ type: 'ADD_CATEGORY', payload: response.data });
        return response.data;
      }
      console.error('Failed to add category:', response.error);
      return null;
    } catch (error) {
      console.error('Error adding category:', error);
      return null;
    }
  }, []);

  const updateCategory = useCallback(async (id: string, category: Omit<Category, 'id'>): Promise<Category | null> => {
    try {
      const response = await categoriesApi.update(id, category);
      if (response.success && response.data) {
        dispatch({ type: 'UPDATE_CATEGORY', payload: response.data });
        return response.data;
      }
      console.error('Failed to update category:', response.error);
      return null;
    } catch (error) {
      console.error('Error updating category:', error);
      return null;
    }
  }, []);

  const deleteCategory = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await categoriesApi.delete(id);
      if (response.success) {
        dispatch({ type: 'DELETE_CATEGORY', payload: id });
        return true;
      }
      console.error('Failed to delete category:', response.error);
      return false;
    } catch (error) {
      console.error('Error deleting category:', error);
      return false;
    }
  }, []);

  const resetCategories = useCallback(async (): Promise<boolean> => {
    try {
      const response = await categoriesApi.reset();
      if (response.success && response.data) {
        dispatch({ type: 'SET_CATEGORIES', payload: response.data });
        return true;
      }
      console.error('Failed to reset categories:', response.error);
      return false;
    } catch (error) {
      console.error('Error resetting categories:', error);
      return false;
    }
  }, []);

  // Settings API actions
  const updateSettings = useCallback(async (settings: Partial<AppSettings>): Promise<AppSettings | null> => {
    try {
      const response = await settingsApi.update(settings);
      if (response.success && response.data) {
        dispatch({ type: 'UPDATE_SETTINGS', payload: response.data });
        return response.data;
      }
      console.error('Failed to update settings:', response.error);
      return null;
    } catch (error) {
      console.error('Error updating settings:', error);
      return null;
    }
  }, []);

  // Backup API actions
  const importData = useCallback(async (data: BackupData): Promise<boolean> => {
    try {
      const response = await backupApi.import(data);
      if (response.success) {
        // Reload all data after import
        await loadData();
        return true;
      }
      console.error('Failed to import data:', response.error);
      return false;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }, [loadData]);

  const exportData = useCallback(async (): Promise<BackupData | null> => {
    try {
      const response = await backupApi.export();
      if (response.success && response.data) {
        return response.data;
      }
      console.error('Failed to export data:', response.error);
      return null;
    } catch (error) {
      console.error('Error exporting data:', error);
      return null;
    }
  }, []);

  const clearAllData = useCallback(async (): Promise<boolean> => {
    try {
      const response = await backupApi.clear();
      if (response.success) {
        dispatch({ type: 'CLEAR_ALL_DATA' });
        // Reload to get default categories
        await loadData();
        return true;
      }
      console.error('Failed to clear data:', response.error);
      return false;
    } catch (error) {
      console.error('Error clearing data:', error);
      return false;
    }
  }, [loadData]);

  // Helper functions
  const getPersonById = useCallback((id: string) => state.people.find((p) => p.id === id), [state.people]);

  const getCategoryByName = useCallback((name: string) =>
    state.categories.find((c) => c.name === name), [state.categories]);

  const getExpensesByMonth = useCallback((year: number, month: number) =>
    state.expenses.filter((e) => {
      if (e.dueDate) {
        const date = new Date(e.dueDate);
        return date.getFullYear() === year && date.getMonth() === month;
      }
      return false;
    }), [state.expenses]);

  const getExpensesByPerson = useCallback((personId: string) =>
    state.expenses.filter((e) => e.paidById === personId), [state.expenses]);

  const toggleTheme = useCallback(() => {
    const newTheme = state.settings.theme === 'dark' ? 'light' : 'dark';
    updateSettings({ ...state.settings, theme: newTheme });
  }, [state.settings, updateSettings]);

  const value: AppContextType = {
    state,
    dispatch,
    loadData,
    addPerson,
    updatePerson,
    deletePerson,
    addExpense,
    addExpenses,
    updateExpense,
    deleteExpense,
    deleteExpensesByGroup,
    markSplitPaid,
    markMonthlyPayment,
    addCategory,
    updateCategory,
    deleteCategory,
    resetCategories,
    updateSettings,
    importData,
    exportData,
    clearAllData,
    getPersonById,
    getCategoryByName,
    getExpensesByMonth,
    getExpensesByPerson,
    toggleTheme,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// Custom hook to use the context
export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// Export action creators for backward compatibility (dispatch-based)
// Note: Prefer using the API-backed functions from useApp() instead
export const actions = {
  setLoading: (loading: boolean): AppAction => ({
    type: 'SET_LOADING',
    payload: loading,
  }),
  setError: (error: string | null): AppAction => ({
    type: 'SET_ERROR',
    payload: error,
  }),
};