import React, { useMemo } from 'react';
import { Box, Card, CardContent, Typography, Avatar } from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AccountBalance as AccountBalanceIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useApp } from '../contexts/AppContext';
import { formatCurrency, calculateTotalByStatus, groupExpensesByCategory } from '../utils';
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

  const totals = useMemo(() => {
    const now = new Date();
    return calculateTotalByStatus(currentMonthExpenses, now.getMonth(), now.getFullYear());
  }, [currentMonthExpenses]);

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

  // Calculate expenses per person (including splits)
  const expensesByPerson = useMemo(() => {
    const personData: Map<string, { total: number; count: number; splitCount: number }> = new Map();
    
    // Initialize for all people
    state.people.forEach(person => {
      personData.set(person.id, { total: 0, count: 0, splitCount: 0 });
    });

    // Count expenses for each person
    currentMonthExpenses.forEach(expense => {
      // Count for the payer
      const payerData = personData.get(expense.paidById);
      if (payerData) {
        personData.set(expense.paidById, {
          ...payerData,
          count: payerData.count + 1,
        });
      }

      // Count split amounts for each person
      expense.splitBetween.forEach(split => {
        const data = personData.get(split.personId);
        if (data) {
          personData.set(split.personId, {
            ...data,
            total: data.total + split.amount,
            splitCount: data.splitCount + 1,
          });
        }
      });
    });

    return state.people.map(person => {
      const data = personData.get(person.id) || { total: 0, count: 0, splitCount: 0 };
      return {
        name: person.name,
        color: person.color,
        total: data.total,
        count: data.count,
        splitCount: data.splitCount,
      };
    }).filter(p => p.total > 0 || p.count > 0);
  }, [currentMonthExpenses, state.people]);

  const summaryCards = [
    { title: 'Total do Mês', value: totals.pending + totals.paid + totals.overdue, icon: <AccountBalanceIcon />, color: '#2196F3' },
    { title: 'Pago', value: totals.paid, icon: <TrendingDownIcon />, color: '#4CAF50' },
    { title: 'Pendente', value: totals.pending, icon: <TrendingUpIcon />, color: '#FF9800' },
    { title: 'Vencido', value: totals.overdue, icon: <WarningIcon />, color: '#F44336' },
  ];

  return (
    <Box>
      <Typography variant="h4" fontWeight={600} mb={{ xs: 2, md: 3 }} sx={{ fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' } }}>
        Painel
      </Typography>

      <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }} mb={{ xs: 2, md: 3 }}>
        {summaryCards.map((card) => (
          <Grid item xs={6} sm={6} md={3} key={card.title}>
            <Card>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography color="text.secondary" variant="body2" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }} noWrap>
                      {card.title}
                    </Typography>
                    <Typography variant="h5" fontWeight={600} sx={{ fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' } }}>
                      {formatCurrency(card.value)}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: card.color, width: { xs: 32, sm: 40 }, height: { xs: 32, sm: 40 }, ml: 1 }}>
                    {card.icon}
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: { xs: 300, sm: 350, md: 400 } }}>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 }, height: '100%' }}>
              <Typography variant="h6" mb={{ xs: 1, md: 2 }} sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>
                Despesas por Categoria
              </Typography>
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="85%">
                  <PieChart>
                    <Pie 
                      data={categoryData} 
                      dataKey="value" 
                      nameKey="name" 
                      cx="50%" 
                      cy="50%" 
                      outerRadius="70%"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ strokeWidth: 1 }}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '85%' }}>
                  <Typography color="text.secondary">Nenhuma despesa este mês</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: { xs: 300, sm: 350, md: 400 } }}>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 }, height: '100%' }}>
              <Typography variant="h6" mb={{ xs: 1, md: 2 }} sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>
                Tendência Mensal
              </Typography>
              <ResponsiveContainer width="100%" height="85%">
                <BarChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `R$${v}`} tick={{ fontSize: 10 }} width={50} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="total" fill="#2196F3" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Expenses by Person Chart */}
        {expensesByPerson.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card sx={{ height: { xs: 300, sm: 350, md: 400 } }}>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 }, height: '100%' }}>
                <Typography variant="h6" mb={{ xs: 1, md: 2 }} sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>
                  Despesas por Pessoa
                </Typography>
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart data={expensesByPerson} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => `R$${v}`} tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 11 }} />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => `${label}`}
                    />
                    <Bar dataKey="total" name="Valor Total" radius={[0, 4, 4, 0]}>
                      {expensesByPerson.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Person Expense Count Chart */}
        {expensesByPerson.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card sx={{ height: { xs: 300, sm: 350, md: 400 } }}>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 }, height: '100%' }}>
                <Typography variant="h6" mb={{ xs: 1, md: 2 }} sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>
                  Quantidade de Despesas por Pessoa
                </Typography>
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart data={expensesByPerson} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="count" name="Despesas Pagas" fill="#2196F3" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="splitCount" name="Participações" fill="#4CAF50" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

      </Grid>
    </Box>
  );
}