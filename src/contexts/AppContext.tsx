import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { Person, Expense, Category, AppSettings } from '../types';
import * as storage from '../services/storage';

// State type
interface AppState {
  people: Person[];
  expenses: Expense[];
  categories: Category[];
  settings: AppSettings;
  isLoading: boolean;
}

// Action types
type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOAD_DATA'; payload: Omit<AppState, 'isLoading'> }
  // People actions
  | { type: 'ADD_PERSON'; payload: Person }
  | { type: 'UPDATE_PERSON'; payload: Person }
  | { type: 'DELETE_PERSON'; payload: string }
  // Expense actions
  | { type: 'ADD_EXPENSE'; payload: Expense }
  | { type: 'ADD_EXPENSES'; payload: Expense[] }
  | { type: 'UPDATE_EXPENSE'; payload: Expense }
  | { type: 'DELETE_EXPENSE'; payload: string }
  | { type: 'DELETE_EXPENSES_BY_GROUP'; payload: string }
  | { type: 'MARK_SPLIT_PAID'; payload: { expenseId: string; personId: string; isPaid: boolean } }
  // Category actions
  | { type: 'ADD_CATEGORY'; payload: Category }
  | { type: 'UPDATE_CATEGORY'; payload: Category }
  | { type: 'DELETE_CATEGORY'; payload: string }
  | { type: 'RESET_CATEGORIES' }
  // Settings actions
  | { type: 'UPDATE_SETTINGS'; payload: AppSettings }
  // Data management
  | { type: 'IMPORT_DATA'; payload: storage.BackupData }
  | { type: 'CLEAR_ALL_DATA' };

// Initial state
const initialState: AppState = {
  people: [],
  expenses: [],
  categories: [],
  settings: {
    theme: 'system',
    currency: 'BRL',
    locale: 'pt-BR',
    defaultCategories: [],
  },
  isLoading: true,
};

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'LOAD_DATA':
      return { ...state, ...action.payload, isLoading: false };

    // People
    case 'ADD_PERSON':
      storage.addPerson(action.payload);
      return { ...state, people: [...state.people, action.payload] };

    case 'UPDATE_PERSON':
      storage.updatePerson(action.payload);
      return {
        ...state,
        people: state.people.map((p) =>
          p.id === action.payload.id ? action.payload : p
        ),
      };

    case 'DELETE_PERSON':
      storage.deletePerson(action.payload);
      return {
        ...state,
        people: state.people.filter((p) => p.id !== action.payload),
      };

    // Expenses
    case 'ADD_EXPENSE':
      storage.addExpense(action.payload);
      return { ...state, expenses: [...state.expenses, action.payload] };

    case 'ADD_EXPENSES':
      storage.addExpenses(action.payload);
      return { ...state, expenses: [...state.expenses, ...action.payload] };

    case 'UPDATE_EXPENSE':
      storage.updateExpense(action.payload);
      return {
        ...state,
        expenses: state.expenses.map((e) =>
          e.id === action.payload.id ? action.payload : e
        ),
      };

    case 'DELETE_EXPENSE':
      storage.deleteExpense(action.payload);
      return {
        ...state,
        expenses: state.expenses.filter((e) => e.id !== action.payload),
      };

    case 'DELETE_EXPENSES_BY_GROUP':
      storage.deleteExpensesByGroupId(action.payload);
      return {
        ...state,
        expenses: state.expenses.filter(
          (e) => e.installmentGroupId !== action.payload
        ),
      };

    case 'MARK_SPLIT_PAID': {
      const { expenseId, personId, isPaid } = action.payload;
      const updatedExpenses = state.expenses.map((e) => {
        if (e.id === expenseId) {
          const updatedSplits = e.splitBetween.map((s) =>
            s.personId === personId
              ? { ...s, isPaid, paidAt: isPaid ? new Date().toISOString() : undefined }
              : s
          );
          // Check if all splits are paid
          const allPaid = updatedSplits.every((s) => s.isPaid);
          // Se alguém desmarcou, volta para pending
          const newStatus = allPaid ? 'paid' as const : 'pending' as const;
          const updatedExpense = {
            ...e,
            splitBetween: updatedSplits,
            status: newStatus,
            paidAt: allPaid ? new Date().toISOString() : undefined,
          };
          storage.updateExpense(updatedExpense);
          return updatedExpense;
        }
        return e;
      });
      return { ...state, expenses: updatedExpenses };
    }

    // Categories
    case 'ADD_CATEGORY':
      storage.addCategory(action.payload);
      return { ...state, categories: [...state.categories, action.payload] };

    case 'UPDATE_CATEGORY':
      storage.updateCategory(action.payload);
      return {
        ...state,
        categories: state.categories.map((c) =>
          c.id === action.payload.id ? action.payload : c
        ),
      };

    case 'DELETE_CATEGORY':
      storage.deleteCategory(action.payload);
      return {
        ...state,
        categories: state.categories.filter((c) => c.id !== action.payload),
      };

    case 'RESET_CATEGORIES':
      storage.resetCategories();
      return { ...state, categories: storage.getCategories() };

    // Settings
    case 'UPDATE_SETTINGS':
      storage.saveSettings(action.payload);
      return { ...state, settings: action.payload };

    // Data management
    case 'IMPORT_DATA':
      storage.importData(action.payload);
      return {
        ...state,
        people: action.payload.people || state.people,
        expenses: action.payload.expenses || state.expenses,
        categories: action.payload.categories || state.categories,
        settings: action.payload.settings || state.settings,
      };

    case 'CLEAR_ALL_DATA':
      storage.clearAllData();
      return {
        ...initialState,
        categories: storage.getCategories(),
        settings: storage.getSettings(),
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

  // Load data from localStorage on mount
  useEffect(() => {
    const loadData = () => {
      const people = storage.getPeople();
      const expenses = storage.getExpenses();
      const categories = storage.getCategories();
      const settings = storage.getSettings();

      dispatch({
        type: 'LOAD_DATA',
        payload: { people, expenses, categories, settings },
      });
    };

    loadData();
  }, []);

  // Helper functions
  const getPersonById = (id: string) => state.people.find((p) => p.id === id);

  const getCategoryByName = (name: string) =>
    state.categories.find((c) => c.name === name);

  const getExpensesByMonth = (year: number, month: number) =>
    state.expenses.filter((e) => {
      if (e.dueDate) {
        const date = new Date(e.dueDate);
        return date.getFullYear() === year && date.getMonth() === month;
      }
      return false;
    });

  const getExpensesByPerson = (personId: string) =>
    state.expenses.filter((e) => e.paidById === personId);

  const toggleTheme = () => {
    const newTheme = state.settings.theme === 'dark' ? 'light' : 'dark';
    dispatch(actions.updateSettings({ ...state.settings, theme: newTheme }));
  };

  const value: AppContextType = {
    state,
    dispatch,
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

// Export action creators for convenience
export const actions = {
  setLoading: (loading: boolean): AppAction => ({
    type: 'SET_LOADING',
    payload: loading,
  }),
  addPerson: (person: Person): AppAction => ({
    type: 'ADD_PERSON',
    payload: person,
  }),
  updatePerson: (person: Person): AppAction => ({
    type: 'UPDATE_PERSON',
    payload: person,
  }),
  deletePerson: (id: string): AppAction => ({
    type: 'DELETE_PERSON',
    payload: id,
  }),
  addExpense: (expense: Expense): AppAction => ({
    type: 'ADD_EXPENSE',
    payload: expense,
  }),
  addExpenses: (expenses: Expense[]): AppAction => ({
    type: 'ADD_EXPENSES',
    payload: expenses,
  }),
  updateExpense: (expense: Expense): AppAction => ({
    type: 'UPDATE_EXPENSE',
    payload: expense,
  }),
  deleteExpense: (id: string): AppAction => ({
    type: 'DELETE_EXPENSE',
    payload: id,
  }),
  deleteExpensesByGroup: (groupId: string): AppAction => ({
    type: 'DELETE_EXPENSES_BY_GROUP',
    payload: groupId,
  }),
  markSplitPaid: (expenseId: string, personId: string, isPaid: boolean): AppAction => ({
    type: 'MARK_SPLIT_PAID',
    payload: { expenseId, personId, isPaid },
  }),
  addCategory: (category: Category): AppAction => ({
    type: 'ADD_CATEGORY',
    payload: category,
  }),
  updateCategory: (category: Category): AppAction => ({
    type: 'UPDATE_CATEGORY',
    payload: category,
  }),
  deleteCategory: (id: string): AppAction => ({
    type: 'DELETE_CATEGORY',
    payload: id,
  }),
  resetCategories: (): AppAction => ({ type: 'RESET_CATEGORIES' }),
  updateSettings: (settings: AppSettings): AppAction => ({
    type: 'UPDATE_SETTINGS',
    payload: settings,
  }),
  importData: (data: storage.BackupData): AppAction => ({
    type: 'IMPORT_DATA',
    payload: data,
  }),
  clearAllData: (): AppAction => ({ type: 'CLEAR_ALL_DATA' }),
};