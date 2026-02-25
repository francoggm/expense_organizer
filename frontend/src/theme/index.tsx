import { createContext, useContext, useState, useMemo, useEffect, type ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  actualMode: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'expense_organizer_theme';

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Load theme from localStorage
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return (saved as ThemeMode) || 'system';
  });
  const [systemMode, setSystemMode] = useState<'light' | 'dark'>('light');

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemMode(mediaQuery.matches ? 'dark' : 'light');

    const handler = (e: MediaQueryListEvent) => {
      setSystemMode(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem(THEME_STORAGE_KEY, newMode);
  };

  const actualMode = mode === 'system' ? systemMode : mode;

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: actualMode,
          primary: {
            main: '#2196F3',
            light: '#64B5F6',
            dark: '#1976D2',
          },
          secondary: {
            main: '#FF4081',
            light: '#FF79B0',
            dark: '#C60055',
          },
          success: {
            main: '#4CAF50',
            light: '#81C784',
            dark: '#388E3C',
          },
          warning: {
            main: '#FF9800',
            light: '#FFB74D',
            dark: '#F57C00',
          },
          error: {
            main: '#F44336',
            light: '#E57373',
            dark: '#D32F2F',
          },
          background: {
            default: actualMode === 'dark' ? '#121212' : '#F5F5F5',
            paper: actualMode === 'dark' ? '#1E1E1E' : '#FFFFFF',
          },
          text: {
            primary: actualMode === 'dark' ? '#FFFFFF' : '#212121',
            secondary: actualMode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
          },
          divider: actualMode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
        },
        typography: {
          fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
          h1: {
            fontSize: '2.5rem',
            fontWeight: 500,
          },
          h2: {
            fontSize: '2rem',
            fontWeight: 500,
          },
          h3: {
            fontSize: '1.75rem',
            fontWeight: 500,
          },
          h4: {
            fontSize: '1.5rem',
            fontWeight: 500,
          },
          h5: {
            fontSize: '1.25rem',
            fontWeight: 500,
          },
          h6: {
            fontSize: '1rem',
            fontWeight: 500,
          },
        },
        shape: {
          borderRadius: 8,
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                fontWeight: 500,
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                boxShadow: actualMode === 'dark'
                  ? '0 2px 8px rgba(0, 0, 0, 0.3)'
                  : '0 2px 8px rgba(0, 0, 0, 0.1)',
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
              },
            },
          },
          MuiAppBar: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
              },
            },
          },
          MuiDrawer: {
            styleOverrides: {
              paper: {
                backgroundImage: 'none',
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: {
                fontWeight: 500,
              },
            },
          },
          MuiTableCell: {
            styleOverrides: {
              head: {
                fontWeight: 600,
              },
            },
          },
        },
      }),
    [actualMode]
  );

  const value: ThemeContextType = {
    mode,
    setMode,
    actualMode,
  };

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}