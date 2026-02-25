import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { Person, Expense, Category, AppSettings, MonthlyPayment } from '../types';
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
  | { type: 'MARK_MONTHLY_PAYMENT'; payload: { expenseId: string; month: number; year: number; isPaid: boolean; personId?: string } }
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
    case 'ADD_PERSON': {
      // Check if person already exists to prevent duplicates
      if (state.people.some(p => p.id === action.payload.id)) {
        return state;
      }
      const newPeople = [...state.people, action.payload];
      storage.savePeople(newPeople);
      return { ...state, people: newPeople };
    }

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
    case 'ADD_EXPENSE': {
      // Check if expense already exists to prevent duplicates
      if (state.expenses.some(e => e.id === action.payload.id)) {
        return state;
      }
      const newExpenses = [...state.expenses, action.payload];
      storage.saveExpenses(newExpenses);
      return { ...state, expenses: newExpenses };
    }

    case 'ADD_EXPENSES': {
      // Filter out any expenses that already exist
      const newExpensesToAdd = action.payload.filter(
        newExp => !state.expenses.some(e => e.id === newExp.id)
      );
      if (newExpensesToAdd.length === 0) {
        return state;
      }
      const newExpenses = [...state.expenses, ...newExpensesToAdd];
      storage.saveExpenses(newExpenses);
      return { ...state, expenses: newExpenses };
    }

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

    case 'MARK_MONTHLY_PAYMENT': {
      const { expenseId, month, year, isPaid, personId } = action.payload;
      const updatedExpenses = state.expenses.map((e) => {
        if (e.id === expenseId && e.isRecurring) {
          const monthlyPayments = e.monthlyPayments || [];
          const existingPaymentIndex = monthlyPayments.findIndex(
            (mp) => mp.month === month && mp.year === year
          );

          let updatedMonthlyPayments: MonthlyPayment[];

          if (existingPaymentIndex >= 0) {
            // Update existing payment
            updatedMonthlyPayments = monthlyPayments.map((mp, index) => {
              if (index === existingPaymentIndex) {
                if (personId) {
                  // Update specific person's payment
                  const splitPayments = mp.splitPayments || e.splitBetween.map(s => ({
                    personId: s.personId,
                    isPaid: false,
                  }));
                  const updatedSplitPayments = splitPayments.map(sp =>
                    sp.personId === personId
                      ? { ...sp, isPaid, paidAt: isPaid ? new Date().toISOString() : undefined }
                      : sp
                  );
                  const allPaid = updatedSplitPayments.every(sp => sp.isPaid);
                  return {
                    ...mp,
                    splitPayments: updatedSplitPayments,
                    isPaid: allPaid,
                    paidAt: allPaid ? new Date().toISOString() : undefined,
                  };
                } else {
                  // Update entire payment status
                  return {
                    ...mp,
                    isPaid,
                    paidAt: isPaid ? new Date().toISOString() : undefined,
                    splitPayments: mp.splitPayments?.map(sp => ({
                      ...sp,
                      isPaid,
                      paidAt: isPaid ? new Date().toISOString() : undefined,
                    })),
                  };
                }
              }
              return mp;
            });
          } else {
            // Create new payment record
            const newPayment: MonthlyPayment = {
              month,
              year,
              isPaid: personId ? false : isPaid,
              paidAt: isPaid && !personId ? new Date().toISOString() : undefined,
              splitPayments: e.splitBetween.map(s => ({
                personId: s.personId,
                isPaid: personId ? s.personId === personId && isPaid : isPaid,
                paidAt: (personId ? s.personId === personId && isPaid : isPaid) 
                  ? new Date().toISOString() 
                  : undefined,
              })),
            };
            if (personId) {
              newPayment.isPaid = newPayment.splitPayments?.every(sp => sp.isPaid) || false;
            }
            updatedMonthlyPayments = [...monthlyPayments, newPayment];
          }

          const updatedExpense = {
            ...e,
            monthlyPayments: updatedMonthlyPayments,
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
      let people = storage.getPeople();
      let expenses = storage.getExpenses();
      const categories = storage.getCategories();
      const settings = storage.getSettings();

      // Remove duplicate people (keep first occurrence of each ID)
      const seenPeopleIds = new Set<string>();
      const uniquePeople = people.filter((person) => {
        if (seenPeopleIds.has(person.id)) {
          return false;
        }
        seenPeopleIds.add(person.id);
        return true;
      });

      // If duplicates were found, save the cleaned list
      if (uniquePeople.length !== people.length) {
        storage.savePeople(uniquePeople);
        people = uniquePeople;
      }

      // Remove duplicate expenses (keep first occurrence of each ID)
      const seenExpenseIds = new Set<string>();
      const uniqueExpenses = expenses.filter((expense) => {
        if (seenExpenseIds.has(expense.id)) {
          return false;
        }
        seenExpenseIds.add(expense.id);
        return true;
      });

      // If duplicates were found, save the cleaned list
      if (uniqueExpenses.length !== expenses.length) {
        storage.saveExpenses(uniqueExpenses);
        expenses = uniqueExpenses;
      }

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
  markMonthlyPayment: (expenseId: string, month: number, year: number, isPaid: boolean, personId?: string): AppAction => ({
    type: 'MARK_MONTHLY_PAYMENT',
    payload: { expenseId, month, year, isPaid, personId },
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