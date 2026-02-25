import type { Person, Expense, Category, AppSettings, BackupData } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Token management
let authToken: string | null = localStorage.getItem('auth_token');

export const setAuthToken = (token: string | null): void => {
  authToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
};

export const getAuthToken = (): string | null => authToken;

export const isAuthenticated = (): boolean => !!authToken;

// API Response type
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Generic fetch wrapper with auth
const apiFetch = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle 401 - unauthorized
      if (response.status === 401) {
        setAuthToken(null);
        window.dispatchEvent(new CustomEvent('auth:logout'));
      }
      return {
        success: false,
        error: data.error || `HTTP error ${response.status}`,
      };
    }

    return data;
  } catch (error) {
    console.error('API fetch error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
};

// Auth API
export const authApi = {
  login: async (password: string): Promise<ApiResponse<{ token: string; expiresIn: string }>> => {
    const response = await apiFetch<{ token: string; expiresIn: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    
    if (response.success && response.data?.token) {
      setAuthToken(response.data.token);
    }
    
    return response;
  },

  verify: async (): Promise<ApiResponse<{ authenticated: boolean }>> => {
    return apiFetch<{ authenticated: boolean }>('/auth/verify');
  },

  logout: async (): Promise<void> => {
    await apiFetch('/auth/logout', { method: 'POST' });
    setAuthToken(null);
  },
};

// People API
export const peopleApi = {
  getAll: async (): Promise<ApiResponse<Person[]>> => {
    return apiFetch<Person[]>('/people');
  },

  getById: async (id: string): Promise<ApiResponse<Person>> => {
    return apiFetch<Person>(`/people/${id}`);
  },

  create: async (person: Omit<Person, 'id' | 'createdAt'>): Promise<ApiResponse<Person>> => {
    return apiFetch<Person>('/people', {
      method: 'POST',
      body: JSON.stringify(person),
    });
  },

  update: async (id: string, person: Omit<Person, 'id' | 'createdAt'>): Promise<ApiResponse<Person>> => {
    return apiFetch<Person>(`/people/${id}`, {
      method: 'PUT',
      body: JSON.stringify(person),
    });
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiFetch<void>(`/people/${id}`, {
      method: 'DELETE',
    });
  },
};

// Expenses API
export const expensesApi = {
  getAll: async (): Promise<ApiResponse<Expense[]>> => {
    return apiFetch<Expense[]>('/expenses');
  },

  getById: async (id: string): Promise<ApiResponse<Expense>> => {
    return apiFetch<Expense>(`/expenses/${id}`);
  },

  create: async (expense: Expense): Promise<ApiResponse<Expense>> => {
    return apiFetch<Expense>('/expenses', {
      method: 'POST',
      body: JSON.stringify(expense),
    });
  },

  createBulk: async (expenses: Expense[]): Promise<ApiResponse<Expense[]>> => {
    return apiFetch<Expense[]>('/expenses/bulk', {
      method: 'POST',
      body: JSON.stringify(expenses),
    });
  },

  update: async (id: string, expense: Expense): Promise<ApiResponse<Expense>> => {
    return apiFetch<Expense>(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(expense),
    });
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiFetch<void>(`/expenses/${id}`, {
      method: 'DELETE',
    });
  },

  deleteByGroup: async (groupId: string): Promise<ApiResponse<{ deletedCount: number }>> => {
    return apiFetch<{ deletedCount: number }>(`/expenses/group/${groupId}`, {
      method: 'DELETE',
    });
  },

  markSplitPaid: async (
    expenseId: string,
    personId: string,
    isPaid: boolean
  ): Promise<ApiResponse<Expense>> => {
    return apiFetch<Expense>(`/expenses/${expenseId}/split/${personId}/paid`, {
      method: 'PATCH',
      body: JSON.stringify({ isPaid }),
    });
  },

  markMonthlyPayment: async (
    expenseId: string,
    month: number,
    year: number,
    isPaid: boolean,
    personId?: string
  ): Promise<ApiResponse<Expense>> => {
    return apiFetch<Expense>(`/expenses/${expenseId}/monthly-payment`, {
      method: 'PATCH',
      body: JSON.stringify({ month, year, isPaid, personId }),
    });
  },
};

// Categories API
export const categoriesApi = {
  getAll: async (): Promise<ApiResponse<Category[]>> => {
    return apiFetch<Category[]>('/categories');
  },

  getById: async (id: string): Promise<ApiResponse<Category>> => {
    return apiFetch<Category>(`/categories/${id}`);
  },

  create: async (category: Omit<Category, 'id'>): Promise<ApiResponse<Category>> => {
    return apiFetch<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(category),
    });
  },

  update: async (id: string, category: Omit<Category, 'id'>): Promise<ApiResponse<Category>> => {
    return apiFetch<Category>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(category),
    });
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiFetch<void>(`/categories/${id}`, {
      method: 'DELETE',
    });
  },

  reset: async (): Promise<ApiResponse<Category[]>> => {
    return apiFetch<Category[]>('/categories/reset', {
      method: 'POST',
    });
  },
};

// Settings API
export const settingsApi = {
  get: async (): Promise<ApiResponse<AppSettings>> => {
    return apiFetch<AppSettings>('/settings');
  },

  update: async (settings: Partial<AppSettings>): Promise<ApiResponse<AppSettings>> => {
    return apiFetch<AppSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },
};

// Backup API
export const backupApi = {
  export: async (): Promise<ApiResponse<BackupData>> => {
    return apiFetch<BackupData>('/backup/export');
  },

  import: async (data: BackupData): Promise<ApiResponse<void>> => {
    return apiFetch<void>('/backup/import', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  clear: async (): Promise<ApiResponse<void>> => {
    return apiFetch<void>('/backup/clear', {
      method: 'DELETE',
    });
  },
};

// Export all APIs
export const api = {
  auth: authApi,
  people: peopleApi,
  expenses: expensesApi,
  categories: categoriesApi,
  settings: settingsApi,
  backup: backupApi,
};

export default api;