import React, { useMemo, useState } from 'react';
import { Box, Typography, Card, CardContent, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import Grid from '@mui/material/Grid';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import { useApp } from '../contexts/AppContext';
import { formatCurrency, groupExpensesByCategory } from '../utils';
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isBefore, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Reports() {
  const { state, getPersonById } = useApp();
  const [period, setPeriod] = useState(6);

  const monthlyData = useMemo(() => {
    const data = [];
    for (let i = period - 1; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      
      let fixed = 0;
      let variable = 0;
      
      state.expenses.forEach((e) => {
        // Despesas variáveis com dueDate
        if (e.dueDate) {
          const d = parseISO(e.dueDate);
          if (!isBefore(d, start) && !isAfter(d, end)) {
            if (e.type === 'fixed') {
              fixed += e.totalAmount;
            } else {
              variable += e.totalAmount;
            }
          }
        }
        // Despesas fixas com dueDay (incluir em todos os meses)
        else if (e.dueDay && e.type === 'fixed') {
          fixed += e.totalAmount;
        }
      });
      
      data.push({ month: format(date, 'MMM yy', { locale: ptBR }), fixed, variable, total: fixed + variable });
    }
    return data;
  }, [state.expenses, period]);

  const categoryData = useMemo(() => {
    const groups = groupExpensesByCategory(state.expenses);
    return Array.from(groups.entries()).map(([name, data]) => {
      const cat = state.categories.find((c) => c.name === name);
      return { name, value: data.total, color: cat?.color || '#9E9E9E' };
    }).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [state.expenses, state.categories]);

  const personData = useMemo(() => {
    return state.people.map((person) => {
      const total = state.expenses.filter((e) => e.paidById === person.id).reduce((s, e) => s + e.totalAmount, 0);
      return { name: person.name, value: total, color: person.color };
    }).sort((a, b) => b.value - a.value);
  }, [state.expenses, state.people]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>Relatórios</Typography>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Período</InputLabel>
          <Select value={period} label="Período" onChange={(e) => setPeriod(Number(e.target.value))}>
            <MenuItem value={3}>Últimos 3 meses</MenuItem>
            <MenuItem value={6}>Últimos 6 meses</MenuItem>
            <MenuItem value={12}>Últimos 12 meses</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" mb={2}>Tendência de Despesas Mensais</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(v) => `R$${v}`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="fixed" stroke="#2196F3" name="Fixas" strokeWidth={2} />
                  <Line type="monotone" dataKey="variable" stroke="#FF9800" name="Variáveis" strokeWidth={2} />
                  <Line type="monotone" dataKey="total" stroke="#4CAF50" name="Total" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" mb={2}>Por Categoria</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}>
                    {categoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" mb={2}>Por Pessoa</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={personData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => `R$${v}`} />
                  <YAxis type="category" dataKey="name" width={80} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="value" name="Total Pago">
                    {personData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}