import React, { useMemo } from 'react';
import { Box, Card, CardContent, Typography, Avatar } from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AccountBalance as AccountBalanceIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useApp } from '../contexts/AppContext';
import { formatCurrency, calculateTotalByStatus, groupExpensesByCategory, calculateBalances, getDueDateForMonth } from '../utils';
import { startOfMonth, endOfMonth, format, subMonths, parseISO, isBefore, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const { state, getPersonById } = useApp();

  // Incluir despesas fixas e variáveis do mês atual
  const currentMonthExpenses = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return state.expenses.filter((e) => {
      // Despesas variáveis com dueDate
      if (e.dueDate) {
        const date = parseISO(e.dueDate);
        return !isBefore(date, start) && !isAfter(date, end);
      }
      // Despesas fixas com dueDay (sempre incluir no mês atual)
      if (e.dueDay && e.type === 'fixed') {
        return true; // Despesas fixas são mensais
      }
      return false;
    });
  }, [state.expenses]);

  const totals = useMemo(() => calculateTotalByStatus(currentMonthExpenses), [currentMonthExpenses]);

  const categoryData = useMemo(() => {
    const groups = groupExpensesByCategory(currentMonthExpenses);
    return Array.from(groups.entries()).map(([category, data]) => {
      const cat = state.categories.find((c) => c.name === category);
      return { name: category, value: data.total, color: cat?.color || '#9E9E9E' };
    }).sort((a, b) => b.value - a.value);
  }, [currentMonthExpenses, state.categories]);

  const monthlyTrend = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const year = date.getFullYear();
      const month = date.getMonth();
      
      // Calcular despesas do mês (variáveis + fixas)
      let monthTotal = 0;
      
      state.expenses.forEach((e) => {
        // Despesas variáveis
        if (e.dueDate) {
          const d = parseISO(e.dueDate);
          if (!isBefore(d, start) && !isAfter(d, end)) {
            monthTotal += e.totalAmount;
          }
        }
        // Despesas fixas (incluir em todos os meses)
        else if (e.dueDay && e.type === 'fixed') {
          monthTotal += e.totalAmount;
        }
      });
      
      months.push({
        month: format(date, 'MMM', { locale: ptBR }),
        total: monthTotal,
      });
    }
    return months;
  }, [state.expenses]);

  const balances = useMemo(() => calculateBalances(state.expenses, state.people), [state.expenses, state.people]);

  const summaryCards = [
    { title: 'Total do Mês', value: totals.pending + totals.paid + totals.overdue, icon: <AccountBalanceIcon />, color: '#2196F3' },
    { title: 'Pago', value: totals.paid, icon: <TrendingDownIcon />, color: '#4CAF50' },
    { title: 'Pendente', value: totals.pending, icon: <TrendingUpIcon />, color: '#FF9800' },
    { title: 'Vencido', value: totals.overdue, icon: <WarningIcon />, color: '#F44336' },
  ];

  return (
    <Box>
      <Typography variant="h4" fontWeight={600} mb={3}>Painel</Typography>

      <Grid container spacing={3} mb={3}>
        {summaryCards.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.title}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" variant="body2">{card.title}</Typography>
                    <Typography variant="h5" fontWeight={600}>{formatCurrency(card.value)}</Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: card.color }}>{card.icon}</Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" mb={2}>Despesas por Categoria</Typography>
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                  <Typography color="text.secondary">Nenhuma despesa este mês</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" mb={2}>Tendência Mensal</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(v) => `R$${v}`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="total" fill="#2196F3" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {balances.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" mb={2}>Saldos</Typography>
                <Grid container spacing={2}>
                  {balances.map((balance, index) => {
                    const from = getPersonById(balance.fromPersonId);
                    const to = getPersonById(balance.toPersonId);
                    return (
                      <Grid item xs={12} sm={6} md={4} key={index}>
                        <Card variant="outlined">
                          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: from?.color }}>{from?.name.charAt(0)}</Avatar>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2">{from?.name} deve para {to?.name}</Typography>
                              <Typography variant="h6" fontWeight={600} color="error.main">{formatCurrency(balance.amount)}</Typography>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}