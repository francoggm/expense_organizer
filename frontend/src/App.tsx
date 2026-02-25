import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './theme';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import People from './pages/People';
import FixedBills from './pages/FixedBills';
import VariableExpenses from './pages/VariableExpenses';
import MonthlySummary from './pages/MonthlySummary';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import LoginPage from './pages/LoginPage';
import { Box, CircularProgress } from '@mui/material';

// Protected routes wrapper
function ProtectedApp() {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isLoggedIn) {
    return <LoginPage onLoginSuccess={() => window.location.reload()} />;
  }

  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="people" element={<People />} />
            <Route path="fixed-bills" element={<FixedBills />} />
            <Route path="variable-expenses" element={<VariableExpenses />} />
            <Route path="monthly-summary" element={<MonthlySummary />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ProtectedApp />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;