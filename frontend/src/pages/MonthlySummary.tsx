import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  Divider,
  Avatar,
  Tooltip,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  CalendarMonth as CalendarIcon,
  Repeat as RepeatIcon,
  ShoppingCart as ShoppingCartIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useApp } from '../contexts/AppContext';
import { formatCurrency } from '../utils';
import type { Expense } from '../types';
import EmptyState from '../components/common/EmptyState';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

export default function MonthlySummary() {
  const { state, markMonthlyPayment } = useApp();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [tabValue, setTabValue] = useState(0);

  const handlePreviousMonth = () => {
    setSelectedMonth(subMonths(selectedMonth, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(addMonths(selectedMonth, 1));
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Get person name by ID
  const getPersonName = (personId: string): string => {
    const person = state.people.find((p) => p.id === personId);
    return person?.name || 'Desconhecido';
  };

  // Get person color by ID
  const getPersonColor = (personId: string): string => {
    const person = state.people.find((p) => p.id === personId);
    return person?.color || '#9e9e9e';
  };

  // Get category info
  const getCategoryInfo = (categoryId: string) => {
    const category = state.settings.defaultCategories.find((c) => c.id === categoryId);
    return category || { name: categoryId, color: '#9e9e9e' };
  };

  // Get monthly payment status for recurring fixed expenses
  const getMonthlyPaymentStatus = (expense: Expense): { isPaid: boolean; splitPayments?: { personId: string; isPaid: boolean }[] } => {
    if (!expense.isRecurring) {
      // For non-recurring expenses, use the regular status
      return { 
        isPaid: expense.status === 'paid',
        splitPayments: expense.splitBetween.map(s => ({ personId: s.personId, isPaid: s.isPaid }))
      };
    }

    const month = selectedMonth.getMonth();
    const year = selectedMonth.getFullYear();
    const monthlyPayment = expense.monthlyPayments?.find(
      (mp) => mp.month === month && mp.year === year
    );

    if (monthlyPayment) {
      return {
        isPaid: monthlyPayment.isPaid,
        splitPayments: monthlyPayment.splitPayments,
      };
    }

    // No payment record for this month = pending
    return { 
      isPaid: false,
      splitPayments: expense.splitBetween.map(s => ({ personId: s.personId, isPaid: false }))
    };
  };

  // Handle marking monthly payment
  const handleMarkMonthlyPayment = async (expenseId: string, isPaid: boolean, personId?: string) => {
    const month = selectedMonth.getMonth();
    const year = selectedMonth.getFullYear();
    try {
      await markMonthlyPayment(expenseId, month, year, isPaid, personId);
    } catch (error) {
      console.error('Error marking monthly payment:', error);
    }
  };

  // Filter expenses for the selected month
  const monthlyExpenses = useMemo(() => {
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);
    const selectedMonthNum = selectedMonth.getMonth();
    const selectedYear = selectedMonth.getFullYear();

    return state.expenses.filter((expense) => {
      // For fixed recurring expenses, check if the dueDay falls within the month
      if (expense.type === 'fixed' && expense.isRecurring && expense.dueDay) {
        // Fixed recurring expenses appear every month
        return true;
      }

      // For variable expenses or fixed with specific date
      if (expense.dueDate) {
        const expenseDate = parseISO(expense.dueDate);
        return isWithinInterval(expenseDate, { start: monthStart, end: monthEnd });
      }

      // For expenses with createdAt date
      if (expense.createdAt) {
        const createdDate = parseISO(expense.createdAt);
        return isWithinInterval(createdDate, { start: monthStart, end: monthEnd });
      }

      return false;
    });
  }, [state.expenses, selectedMonth]);

  // Separate fixed and variable expenses
  const fixedExpenses = useMemo(() => {
    return monthlyExpenses.filter((e) => e.type === 'fixed');
  }, [monthlyExpenses]);

  const variableExpenses = useMemo(() => {
    return monthlyExpenses.filter((e) => e.type === 'variable');
  }, [monthlyExpenses]);

  // Calculate totals with monthly payment status
  const totals = useMemo(() => {
    const fixedTotal = fixedExpenses.reduce((sum, e) => sum + e.totalAmount, 0);
    const variableTotal = variableExpenses.reduce((sum, e) => sum + e.totalAmount, 0);
    const total = fixedTotal + variableTotal;

    // Calculate paid/pending considering monthly payments for recurring expenses
    let paidTotal = 0;
    let pendingTotal = 0;
    let paidCount = 0;
    let pendingCount = 0;

    monthlyExpenses.forEach((expense) => {
      const paymentStatus = getMonthlyPaymentStatus(expense);
      if (paymentStatus.isPaid) {
        paidTotal += expense.totalAmount;
        paidCount++;
      } else {
        pendingTotal += expense.totalAmount;
        pendingCount++;
      }
    });

    return {
      fixed: fixedTotal,
      variable: variableTotal,
      total,
      paid: paidTotal,
      pending: pendingTotal,
      paidCount,
      pendingCount,
    };
  }, [fixedExpenses, variableExpenses, monthlyExpenses, selectedMonth]);

  // Calculate balances for the selected month - only for split expenses
  const balances = useMemo(() => {
    const balanceMap: Map<string, number> = new Map();

    // Only consider expenses with splits (more than one person)
    const splitExpenses = monthlyExpenses.filter(e => e.splitBetween.length > 1);

    for (const expense of splitExpenses) {
      const paidById = expense.paidById;
      
      for (const split of expense.splitBetween) {
        // If this person is not the payer and hasn't paid their part
        if (split.personId !== paidById && !split.isPaid) {
          // Use | as separator since UUIDs contain hyphens
          const key = `${split.personId}|${paidById}`;
          const currentBalance = balanceMap.get(key) || 0;
          balanceMap.set(key, currentBalance + split.amount);
        }
      }
    }

    // Convert to array and simplify (net out mutual debts)
    const result: { fromPersonId: string; toPersonId: string; amount: number }[] = [];
    const processed = new Set<string>();

    for (const [key, amount] of balanceMap) {
      if (processed.has(key) || amount === 0) continue;

      // Split by | to get the full UUIDs
      const [fromId, toId] = key.split('|');
      const reverseKey = `${toId}|${fromId}`;
      const reverseAmount = balanceMap.get(reverseKey) || 0;

      processed.add(key);
      processed.add(reverseKey);

      const netAmount = amount - reverseAmount;

      if (netAmount > 0) {
        result.push({
          fromPersonId: fromId,
          toPersonId: toId,
          amount: netAmount,
        });
      } else if (netAmount < 0) {
        result.push({
          fromPersonId: toId,
          toPersonId: fromId,
          amount: Math.abs(netAmount),
        });
      }
    }

    return result.filter((b) => b.amount > 0);
  }, [monthlyExpenses]);

  // Group expenses by category
  const expensesByCategory = useMemo(() => {
    const grouped: Record<string, { expenses: Expense[]; total: number }> = {};

    monthlyExpenses.forEach((expense) => {
      if (!grouped[expense.category]) {
        grouped[expense.category] = { expenses: [], total: 0 };
      }
      grouped[expense.category].expenses.push(expense);
      grouped[expense.category].total += expense.totalAmount;
    });

    return Object.entries(grouped)
      .map(([category, data]) => ({
        category,
        categoryInfo: getCategoryInfo(category),
        ...data,
      }))
      .sort((a, b) => b.total - a.total);
  }, [monthlyExpenses, state.settings.defaultCategories]);

  const renderExpenseTable = (expenses: Expense[]) => {
    if (expenses.length === 0) {
      return (
        <Card>
          <EmptyState
            icon={<CalendarIcon />}
            title="Nenhuma despesa neste período"
            description="Não há despesas registradas para este mês."
          />
        </Card>
      );
    }

    return (
      <TableContainer component={Paper} sx={{ width: '100%', overflowX: 'auto' }}>
        <Table size="small" sx={{ width: '100%', tableLayout: 'auto' }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>Descrição</TableCell>
              <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Categoria</TableCell>
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Responsável</TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>Valor</TableCell>
              <TableCell align="center">Status</TableCell>
              <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Vencimento</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {expenses.map((expense) => {
              const categoryInfo = getCategoryInfo(expense.category);
              const isPaid = expense.status === 'paid';
              const dueInfo = expense.dueDay
                ? `Dia ${expense.dueDay}`
                : expense.dueDate
                ? format(parseISO(expense.dueDate), 'dd/MM/yyyy')
                : '-';

              const paymentStatus = getMonthlyPaymentStatus(expense);
              const isExpensePaid = paymentStatus.isPaid;

              return (
                <TableRow key={expense.id}>
                  <TableCell sx={{ py: { xs: 1, sm: 2 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {expense.type === 'fixed' ? (
                        <RepeatIcon fontSize="small" color="primary" />
                      ) : (
                        <ShoppingCartIcon fontSize="small" color="secondary" />
                      )}
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: { xs: 100, sm: 200 } }}>
                          {expense.description}
                        </Typography>
                        {expense.installments > 1 && (
                          <Typography variant="caption" color="text.secondary">
                            {expense.currentInstallment}/{expense.installments}x
                          </Typography>
                        )}
                        {expense.isRecurring && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            Recorrente
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    <Chip
                      label={categoryInfo.name}
                      size="small"
                      sx={{
                        bgcolor: categoryInfo.color + '20',
                        color: categoryInfo.color,
                        fontWeight: 500,
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar
                        sx={{
                          width: 24,
                          height: 24,
                          fontSize: '0.75rem',
                          bgcolor: getPersonColor(expense.paidById),
                        }}
                      >
                        {getPersonName(expense.paidById).charAt(0)}
                      </Avatar>
                      <Typography variant="body2">
                        {getPersonName(expense.paidById)}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ py: { xs: 1, sm: 2 } }}>
                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      {formatCurrency(expense.totalAmount)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ py: { xs: 1, sm: 2 } }}>
                    {expense.isRecurring ? (
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={isExpensePaid}
                            onChange={(e) => handleMarkMonthlyPayment(expense.id, e.target.checked)}
                            color="success"
                            size="small"
                          />
                        }
                        label={isExpensePaid ? 'Pago' : 'Pendente'}
                        sx={{ 
                          m: 0,
                          '& .MuiFormControlLabel-label': { 
                            fontSize: '0.75rem',
                            color: isExpensePaid ? 'success.main' : 'warning.main'
                          }
                        }}
                      />
                    ) : (
                      <Chip
                        icon={isExpensePaid ? <CheckCircleIcon /> : <ScheduleIcon />}
                        label={isExpensePaid ? 'Pago' : 'Pendente'}
                        size="small"
                        color={isExpensePaid ? 'success' : 'warning'}
                        variant="outlined"
                      />
                    )}
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    <Typography variant="body2" color="text.secondary">
                      {dueInfo}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Box sx={{ overflow: 'hidden', maxWidth: '100%' }}>
      {/* Header with month selector */}
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between', 
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: { xs: 2, sm: 0 },
          mb: { xs: 2, md: 3 }
        }}
      >
        <Typography variant="h4" fontWeight={600} sx={{ fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' } }}>
          Resumo Mensal
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
          <IconButton onClick={handlePreviousMonth} size="small">
            <ChevronLeftIcon />
          </IconButton>
          <Chip
            icon={<CalendarIcon />}
            label={format(selectedMonth, 'MMM yyyy', { locale: ptBR })}
            color="primary"
            sx={{ minWidth: { xs: 100, sm: 160 }, justifyContent: 'center', textTransform: 'capitalize' }}
          />
          <IconButton onClick={handleNextMonth} size="small">
            <ChevronRightIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Box sx={{ width: '100%', overflow: 'hidden', mb: { xs: 2, md: 3 } }}>
        <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <TrendingUpIcon color="primary" sx={{ mr: 0.5, fontSize: { xs: '1rem', sm: '1.25rem' } }} />
                <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
                  Total do Mês
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight={700} color="primary.main" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' } }}>
                {formatCurrency(totals.total)}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                {monthlyExpenses.length} despesas
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <RepeatIcon color="info" sx={{ mr: 0.5, fontSize: { xs: '1rem', sm: '1.25rem' } }} />
                <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
                  Fixas
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight={700} color="info.main" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' } }}>
                {formatCurrency(totals.fixed)}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                {fixedExpenses.length} despesas
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <ShoppingCartIcon color="secondary" sx={{ mr: 0.5, fontSize: { xs: '1rem', sm: '1.25rem' } }} />
                <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
                  Variáveis
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight={700} color="secondary.main" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' } }}>
                {formatCurrency(totals.variable)}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                {variableExpenses.length} despesas
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <CheckCircleIcon color="success" sx={{ mr: 0.5, fontSize: { xs: '1rem', sm: '1.25rem' } }} />
                <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
                  Pago/Pendente
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <Typography variant="h5" fontWeight={700} color="success.main" sx={{ fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' } }}>
                  {formatCurrency(totals.paid)}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                  /
                </Typography>
                <Typography variant="h6" fontWeight={600} color="warning.main" sx={{ fontSize: { xs: '0.9rem', sm: '1rem', md: '1.25rem' } }}>
                  {formatCurrency(totals.pending)}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                {totals.paidCount}/{totals.pendingCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        </Grid>
      </Box>

      {/* Tabs for different views */}
      <Card sx={{ mb: { xs: 2, md: 3 } }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', overflowX: 'auto' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
          >
            <Tab label="Todas" sx={{ minWidth: { xs: 'auto', sm: 120 }, px: { xs: 1, sm: 2 } }} />
            <Tab label="Fixas" sx={{ minWidth: { xs: 'auto', sm: 120 }, px: { xs: 1, sm: 2 } }} />
            <Tab label="Variáveis" sx={{ minWidth: { xs: 'auto', sm: 120 }, px: { xs: 1, sm: 2 } }} />
            <Tab label="Categorias" sx={{ minWidth: { xs: 'auto', sm: 120 }, px: { xs: 1, sm: 2 } }} />
          </Tabs>
        </Box>

        <CardContent sx={{ p: { xs: 1, sm: 2 }, overflow: 'hidden' }}>
          <TabPanel value={tabValue} index={0}>
            {renderExpenseTable(monthlyExpenses)}
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            {renderExpenseTable(fixedExpenses)}
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            {renderExpenseTable(variableExpenses)}
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            {expensesByCategory.length === 0 ? (
              <Card variant="outlined">
                <EmptyState
                  icon={<CalendarIcon />}
                  title="Nenhuma despesa neste período"
                  description="Não há despesas registradas para este mês."
                />
              </Card>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {expensesByCategory.map(({ category, categoryInfo, expenses, total }) => (
                  <Card key={category} variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              bgcolor: categoryInfo.color,
                            }}
                          />
                          <Typography variant="h6" fontWeight={600}>
                            {categoryInfo.name}
                          </Typography>
                          <Chip label={`${expenses.length} despesas`} size="small" variant="outlined" />
                        </Box>
                        <Typography variant="h6" fontWeight={700} color="primary.main">
                          {formatCurrency(total)}
                        </Typography>
                      </Box>
                      <Divider sx={{ mb: 2 }} />
                      {renderExpenseTable(expenses)}
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </TabPanel>
        </CardContent>
      </Card>

      {/* Balances Card - Quem Deve a Quem (at the end) */}
      {balances.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" mb={2}>Quem Deve a Quem</Typography>
            <Grid container spacing={2}>
              {balances.map((balance, index) => {
                const fromName = getPersonName(balance.fromPersonId);
                const fromColor = getPersonColor(balance.fromPersonId);
                const toName = getPersonName(balance.toPersonId);
                const toColor = getPersonColor(balance.toPersonId);
                return (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Card 
                      variant="outlined" 
                      sx={{ 
                        bgcolor: 'background.default',
                        border: '2px solid',
                        borderColor: 'warning.light',
                      }}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ bgcolor: fromColor, width: 40, height: 40 }}>
                              {fromName.charAt(0)}
                            </Avatar>
                            <Typography variant="subtitle1" fontWeight={600}>
                              {fromName}
                            </Typography>
                          </Box>
                          <ArrowForwardIcon color="action" />
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1" fontWeight={600}>
                              {toName}
                            </Typography>
                            <Avatar sx={{ bgcolor: toColor, width: 40, height: 40 }}>
                              {toName.charAt(0)}
                            </Avatar>
                          </Box>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                          <Chip 
                            label={formatCurrency(balance.amount)}
                            color="error"
                            sx={{ 
                              fontSize: '1.1rem', 
                              fontWeight: 700,
                              py: 2,
                              px: 1,
                            }}
                          />
                          <Typography variant="caption" display="block" color="text.secondary" mt={1}>
                            Valor pendente de pagamento
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
