import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Avatar,
  AvatarGroup,
  Tooltip,
  Switch,
  FormControlLabel,
  Slider,
  Checkbox,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Receipt as ReceiptIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useApp, actions } from '../contexts/AppContext';
import type { Expense, ExpenseFormData } from '../types';
import {
  formatCurrency,
  formatDueDay,
  STATUS_CONFIG,
  PAYMENT_METHOD_LABELS,
  calculateSplitAmounts,
  getExpenseStatus,
} from '../utils';
import { v4 as uuidv4 } from 'uuid';
import ConfirmDialog from '../components/common/ConfirmDialog';
import EmptyState from '../components/common/EmptyState';

const initialFormData: ExpenseFormData = {
  description: '',
  category: '',
  type: 'fixed',
  totalAmount: 0,
  paymentMethod: 'pix',
  installments: 1,
  dueDay: 1,
  paidById: '',
  splitBetween: [],
  isRecurring: true,
  isVariableAmount: false,
  notes: '',
};

export default function FixedBills() {
  const { state, dispatch, getPersonById } = useApp();
  const { expenses, people, categories } = state;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [formData, setFormData] = useState<ExpenseFormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof ExpenseFormData, string>>>({});
  const [isSplit, setIsSplit] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const handlePreviousMonth = () => {
    setSelectedMonth(subMonths(selectedMonth, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(addMonths(selectedMonth, 1));
  };

  // Get monthly payment status for recurring fixed expenses
  const getMonthlyPaymentStatus = (expense: Expense): { isPaid: boolean; splitPayments?: { personId: string; isPaid: boolean }[] } => {
    if (!expense.isRecurring) {
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

    return { 
      isPaid: false,
      splitPayments: expense.splitBetween.map(s => ({ personId: s.personId, isPaid: false }))
    };
  };

  // Handle marking monthly payment
  const handleMarkMonthlyPayment = (expenseId: string, isPaid: boolean, personId?: string) => {
    const month = selectedMonth.getMonth();
    const year = selectedMonth.getFullYear();
    dispatch(actions.markMonthlyPayment(expenseId, month, year, isPaid, personId));
  };

  // Filter only fixed expenses
  const fixedExpenses = useMemo(() => {
    return expenses.filter((e) => e.type === 'fixed');
  }, [expenses]);

  // Get fixed categories
  const fixedCategories = useMemo(() => {
    return categories.filter((c) => c.type === 'fixed' || c.type === 'both');
  }, [categories]);

  const handleOpenDialog = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense);
      const hasSplit = expense.splitBetween.length > 1;
      setIsSplit(hasSplit);
      setFormData({
        description: expense.description,
        category: expense.category,
        type: 'fixed',
        totalAmount: expense.totalAmount,
        paymentMethod: expense.paymentMethod,
        installments: 1,
        dueDay: expense.dueDay,
        paidById: expense.paidById,
        splitBetween: expense.splitBetween.map((s) => ({
          personId: s.personId,
          percentage: s.percentage,
        })),
        isRecurring: expense.isRecurring,
        isVariableAmount: expense.isVariableAmount,
        notes: expense.notes || '',
      });
    } else {
      setEditingExpense(null);
      setIsSplit(false);
      setFormData({
        ...initialFormData,
        paidById: people[0]?.id || '',
        splitBetween: people.length > 0 ? [{ personId: people[0].id, percentage: 100 }] : [],
      });
    }
    setErrors({});
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingExpense(null);
    setFormData(initialFormData);
    setErrors({});
    setIsSplit(false);
  };

  const handleSplitToggle = (checked: boolean) => {
    setIsSplit(checked);
    if (!checked) {
      // Se desativar divisão, colocar 100% para quem paga
      setFormData({
        ...formData,
        splitBetween: [{ personId: formData.paidById, percentage: 100 }],
      });
    } else {
      // Se ativar divisão, dividir igualmente entre todas as pessoas
      const perPerson = Math.floor(100 / people.length);
      let remainder = 100 - (perPerson * people.length);
      const splits = people.map((person, idx) => ({
        personId: person.id,
        percentage: perPerson + (idx < remainder ? 1 : 0),
      }));
      setFormData({ ...formData, splitBetween: splits });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ExpenseFormData, string>> = {};

    if (!formData.description.trim()) {
      newErrors.description = 'Descrição é obrigatória';
    }
    if (!formData.category) {
      newErrors.category = 'Categoria é obrigatória';
    }
    if (formData.totalAmount <= 0) {
      newErrors.totalAmount = 'Valor deve ser maior que zero';
    }
    if (!formData.paidById) {
      newErrors.paidById = 'Selecione quem paga';
    }
    if (!formData.dueDay || formData.dueDay < 1 || formData.dueDay > 31) {
      newErrors.dueDay = 'Dia de vencimento inválido (1-31)';
    }

    const totalPercentage = formData.splitBetween.reduce((sum, s) => sum + s.percentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      newErrors.splitBetween = 'A soma das porcentagens deve ser 100%';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const splitAmounts = calculateSplitAmounts(formData.totalAmount, formData.splitBetween);

    if (editingExpense) {
      const updatedExpense: Expense = {
        ...editingExpense,
        description: formData.description,
        category: formData.category,
        totalAmount: formData.totalAmount,
        paymentMethod: formData.paymentMethod,
        dueDay: formData.dueDay,
        paidById: formData.paidById,
        splitBetween: splitAmounts.map((s, i) => ({
          ...s,
          isPaid: editingExpense.splitBetween[i]?.isPaid || false,
          paidAt: editingExpense.splitBetween[i]?.paidAt,
        })),
        isRecurring: formData.isRecurring,
        isVariableAmount: formData.isVariableAmount,
        notes: formData.notes,
      };
      dispatch(actions.updateExpense(updatedExpense));
    } else {
      const newExpense: Expense = {
        id: uuidv4(),
        description: formData.description,
        category: formData.category,
        type: 'fixed',
        totalAmount: formData.totalAmount,
        paymentMethod: formData.paymentMethod,
        installments: 1,
        currentInstallment: 1,
        dueDay: formData.dueDay,
        paidById: formData.paidById,
        splitBetween: splitAmounts,
        status: 'pending',
        isRecurring: formData.isRecurring,
        isVariableAmount: formData.isVariableAmount,
        notes: formData.notes,
        createdAt: new Date().toISOString(),
      };
      dispatch(actions.addExpense(newExpense));
    }

    handleCloseDialog();
  };

  const handleDeleteClick = (expense: Expense) => {
    setExpenseToDelete(expense);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (expenseToDelete) {
      dispatch(actions.deleteExpense(expenseToDelete.id));
    }
    setDeleteDialogOpen(false);
    setExpenseToDelete(null);
  };


  const handleSplitChange = (personId: string, percentage: number) => {
    const currentSplits = [...formData.splitBetween];
    const existingIndex = currentSplits.findIndex((s) => s.personId === personId);
    
    // Atualizar ou adicionar a porcentagem da pessoa
    if (existingIndex >= 0) {
      if (percentage === 0) {
        currentSplits.splice(existingIndex, 1);
      } else {
        currentSplits[existingIndex] = { personId, percentage };
      }
    } else if (percentage > 0) {
      currentSplits.push({ personId, percentage });
    }
    
    // Se há mais de uma pessoa, ajustar automaticamente as outras porcentagens
    if (currentSplits.length > 1 && percentage > 0) {
      const totalOthers = 100 - percentage;
      const othersCount = currentSplits.filter(s => s.personId !== personId).length;
      const perOther = Math.floor(totalOthers / othersCount);
      let remainder = totalOthers - (perOther * othersCount);
      
      currentSplits.forEach((split, idx) => {
        if (split.personId !== personId) {
          currentSplits[idx] = { 
            personId: split.personId, 
            percentage: perOther + (remainder > 0 ? 1 : 0) 
          };
          if (remainder > 0) remainder--;
        }
      });
    }
    
    setFormData({ ...formData, splitBetween: currentSplits });
  };

  // Função para dividir igualmente entre pessoas selecionadas
  const handleEqualSplit = () => {
    const selectedPeople = formData.splitBetween.filter(s => s.percentage > 0);
    if (selectedPeople.length === 0) return;
    
    const perPerson = Math.floor(100 / selectedPeople.length);
    let remainder = 100 - (perPerson * selectedPeople.length);
    
    const newSplits = selectedPeople.map((split, idx) => ({
      personId: split.personId,
      percentage: perPerson + (idx < remainder ? 1 : 0),
    }));
    
    setFormData({ ...formData, splitBetween: newSplits });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircleIcon sx={{ color: STATUS_CONFIG.paid.color }} />;
      case 'overdue':
        return <WarningIcon sx={{ color: STATUS_CONFIG.overdue.color }} />;
      default:
        return <ScheduleIcon sx={{ color: STATUS_CONFIG.pending.color }} />;
    }
  };

  if (people.length === 0) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Despesas Fixas
        </Typography>
        <EmptyState
          icon={<ReceiptIcon sx={{ fontSize: 64 }} />}
          title="Cadastre pessoas primeiro"
          description="Você precisa cadastrar pelo menos uma pessoa antes de adicionar despesas fixas."
          actionLabel="Ir para Pessoas"
          onAction={() => window.location.href = '/people'}
        />
      </Box>
    );
  }

  return (
    <Box>
      <Box 
        display="flex" 
        flexDirection={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between" 
        alignItems={{ xs: 'stretch', sm: 'center' }}
        gap={{ xs: 2, sm: 0 }}
        mb={{ xs: 2, md: 3 }}
      >
        <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' } }}>
          Despesas Fixas
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconButton onClick={handlePreviousMonth} size="small">
              <ChevronLeftIcon />
            </IconButton>
            <Chip
              icon={<CalendarIcon />}
              label={format(selectedMonth, 'MMM yyyy', { locale: ptBR })}
              color="primary"
              sx={{ minWidth: { xs: 100, sm: 140 }, justifyContent: 'center', textTransform: 'capitalize' }}
            />
            <IconButton onClick={handleNextMonth} size="small">
              <ChevronRightIcon />
            </IconButton>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            fullWidth
            sx={{ display: { xs: 'flex', sm: 'inline-flex' }, width: { xs: '100%', sm: 'auto' } }}
          >
            Nova Despesa
          </Button>
        </Box>
      </Box>

      <Typography variant="body2" color="text.secondary" mb={{ xs: 2, md: 3 }} sx={{ display: { xs: 'none', sm: 'block' } }}>
        Contas recorrentes mensais como água, luz, internet, aluguel, etc. Marque os pagamentos para o mês selecionado.
      </Typography>

      {fixedExpenses.length === 0 ? (
        <EmptyState
          icon={<ReceiptIcon sx={{ fontSize: { xs: 48, md: 64 } }} />}
          title="Nenhuma despesa fixa"
          description="Adicione suas contas fixas mensais para acompanhar os pagamentos."
          actionLabel="Adicionar Despesa Fixa"
          onAction={() => handleOpenDialog()}
        />
      ) : (
        <Grid container spacing={{ xs: 1.5, sm: 2 }}>
          {fixedExpenses.map((expense) => {
            const status = getExpenseStatus(expense);
            const payer = getPersonById(expense.paidById);

            return (
              <Grid item xs={12} sm={6} lg={4} key={expense.id}>
                <Card>
                  <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getStatusIcon(status)}
                        <Typography variant="h6" noWrap sx={{ maxWidth: 180 }}>
                          {expense.description}
                        </Typography>
                      </Box>
                      <Box>
                        <IconButton size="small" onClick={() => handleOpenDialog(expense)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDeleteClick(expense)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>

                    <Typography variant="h5" color="primary" fontWeight="bold" mb={1}>
                      {formatCurrency(expense.totalAmount)}
                    </Typography>

                    <Box display="flex" gap={1} mb={2} flexWrap="wrap">
                      <Chip
                        label={expense.category}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={formatDueDay(expense.dueDay || 1)}
                        size="small"
                        color="info"
                      />
                      {expense.isVariableAmount && (
                        <Chip label="Valor variável" size="small" color="warning" />
                      )}
                    </Box>

                    <Typography variant="body2" color="text.secondary" mb={1}>
                      Pago por: {payer?.name || 'Desconhecido'}
                    </Typography>

                    {expense.splitBetween.length > 1 && expense.isRecurring && (
                      <Box mt={2}>
                        <Typography variant="body2" color="text.secondary" mb={1}>
                          Divisão ({format(selectedMonth, 'MMM/yyyy', { locale: ptBR })}):
                        </Typography>
                        <List dense disablePadding>
                          {expense.splitBetween.map((split) => {
                            const person = getPersonById(split.personId);
                            const paymentStatus = getMonthlyPaymentStatus(expense);
                            const personPayment = paymentStatus.splitPayments?.find(sp => sp.personId === split.personId);
                            const isPersonPaid = personPayment?.isPaid || false;
                            return (
                              <ListItem key={split.personId} disablePadding sx={{ py: 0.5 }}>
                                <ListItemAvatar sx={{ minWidth: 36 }}>
                                  <Avatar
                                    sx={{
                                      width: 24,
                                      height: 24,
                                      bgcolor: person?.color,
                                      fontSize: '0.75rem',
                                    }}
                                  >
                                    {person?.name.charAt(0)}
                                  </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                  primary={`${person?.name}: ${formatCurrency(split.amount)}`}
                                  primaryTypographyProps={{ variant: 'body2' }}
                                />
                                <ListItemSecondaryAction>
                                  <Checkbox
                                    size="small"
                                    checked={isPersonPaid}
                                    onChange={(e) =>
                                      handleMarkMonthlyPayment(expense.id, e.target.checked, split.personId)
                                    }
                                    color="success"
                                  />
                                </ListItemSecondaryAction>
                              </ListItem>
                            );
                          })}
                        </List>
                      </Box>
                    )}

                    {expense.splitBetween.length === 1 && expense.isRecurring && (
                      <Box mt={2}>
                        {(() => {
                          const paymentStatus = getMonthlyPaymentStatus(expense);
                          return (
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={paymentStatus.isPaid}
                                  onChange={(e) => handleMarkMonthlyPayment(expense.id, e.target.checked)}
                                  color="success"
                                />
                              }
                              label={paymentStatus.isPaid ? `Pago (${format(selectedMonth, 'MMM/yyyy', { locale: ptBR })})` : `Marcar como Pago (${format(selectedMonth, 'MMM/yyyy', { locale: ptBR })})`}
                            />
                          );
                        })()}
                      </Box>
                    )}

                    {!expense.isRecurring && expense.splitBetween.length > 1 && (
                      <Box mt={2}>
                        <Typography variant="body2" color="text.secondary" mb={1}>
                          Divisão:
                        </Typography>
                        <List dense disablePadding>
                          {expense.splitBetween.map((split) => {
                            const person = getPersonById(split.personId);
                            return (
                              <ListItem key={split.personId} disablePadding sx={{ py: 0.5 }}>
                                <ListItemAvatar sx={{ minWidth: 36 }}>
                                  <Avatar
                                    sx={{
                                      width: 24,
                                      height: 24,
                                      bgcolor: person?.color,
                                      fontSize: '0.75rem',
                                    }}
                                  >
                                    {person?.name.charAt(0)}
                                  </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                  primary={`${person?.name}: ${formatCurrency(split.amount)}`}
                                  primaryTypographyProps={{ variant: 'body2' }}
                                />
                                <ListItemSecondaryAction>
                                  <Checkbox
                                    size="small"
                                    checked={split.isPaid}
                                    onChange={(e) =>
                                      dispatch(actions.markSplitPaid(expense.id, split.personId, e.target.checked))
                                    }
                                    color="success"
                                  />
                                </ListItemSecondaryAction>
                              </ListItem>
                            );
                          })}
                        </List>
                      </Box>
                    )}

                    {!expense.isRecurring && expense.splitBetween.length === 1 && (
                      <Box mt={2}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={expense.splitBetween[0]?.isPaid || false}
                              onChange={(e) => dispatch(actions.markSplitPaid(expense.id, expense.splitBetween[0].personId, e.target.checked))}
                              color="success"
                            />
                          }
                          label={expense.splitBetween[0]?.isPaid ? "Pago" : "Marcar como Pago"}
                        />
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Add/Edit Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog} 
        maxWidth="sm" 
        fullWidth
        fullScreen={window.innerWidth < 600}
        PaperProps={{
          sx: {
            m: { xs: 0, sm: 2 },
            maxHeight: { xs: '100%', sm: 'calc(100% - 64px)' },
          }
        }}
      >
        <DialogTitle>
          {editingExpense ? 'Editar Despesa Fixa' : 'Nova Despesa Fixa'}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Descrição"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              error={!!errors.description}
              helperText={errors.description}
              fullWidth
              placeholder="Ex: Conta de Luz, Internet, Aluguel"
            />

            <FormControl fullWidth error={!!errors.category}>
              <InputLabel>Categoria</InputLabel>
              <Select
                value={formData.category}
                label="Categoria"
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {fixedCategories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.name}>
                    {cat.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Valor"
              type="number"
              value={formData.totalAmount === 0 ? '' : formData.totalAmount}
              onChange={(e) => {
                const value = e.target.value;
                setFormData({ ...formData, totalAmount: value === '' ? 0 : parseFloat(value) });
              }}
              error={!!errors.totalAmount}
              helperText={errors.totalAmount}
              fullWidth
              inputProps={{ min: 0, step: 0.01 }}
              InputProps={{
                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
              }}
            />

            <TextField
              label="Dia de Vencimento"
              type="number"
              value={formData.dueDay === 0 ? '' : formData.dueDay}
              onChange={(e) => {
                const value = e.target.value;
                setFormData({ ...formData, dueDay: value === '' ? 0 : parseInt(value) });
              }}
              error={!!errors.dueDay}
              helperText={errors.dueDay || 'Dia do mês (1-31)'}
              fullWidth
              inputProps={{ min: 1, max: 31 }}
            />

            <FormControl fullWidth>
              <InputLabel>Forma de Pagamento</InputLabel>
              <Select
                value={formData.paymentMethod}
                label="Forma de Pagamento"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    paymentMethod: e.target.value as ExpenseFormData['paymentMethod'],
                  })
                }
              >
                {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth error={!!errors.paidById}>
              <InputLabel>Quem Paga</InputLabel>
              <Select
                value={formData.paidById}
                label="Quem Paga"
                onChange={(e) => setFormData({ ...formData, paidById: e.target.value })}
              >
                {people.map((person) => (
                  <MenuItem key={person.id} value={person.id}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Avatar sx={{ width: 24, height: 24, bgcolor: person.color, fontSize: '0.75rem' }}>
                        {person.name.charAt(0)}
                      </Avatar>
                      {person.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isVariableAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, isVariableAmount: e.target.checked })
                  }
                />
              }
              label="Valor pode variar mensalmente (ex: luz, água)"
            />

            <Divider />

            <FormControlLabel
              control={
                <Switch
                  checked={isSplit}
                  onChange={(e) => handleSplitToggle(e.target.checked)}
                />
              }
              label="Dividir despesa entre pessoas"
            />

            {isSplit && (
              <>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle2">Divisão da Despesa</Typography>
                  <Button size="small" onClick={handleEqualSplit}>
                    Dividir Igualmente
                  </Button>
                </Box>
                {errors.splitBetween && (
                  <Typography color="error" variant="caption">
                    {errors.splitBetween}
                  </Typography>
                )}

                {people.map((person) => {
                  const split = formData.splitBetween.find((s) => s.personId === person.id);
                  const percentage = split?.percentage || 0;

                  return (
                    <Box key={person.id}>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar sx={{ bgcolor: person.color, width: 32, height: 32 }}>
                          {person.name.charAt(0)}
                        </Avatar>
                        <Typography sx={{ minWidth: 100 }}>{person.name}</Typography>
                        <Slider
                          value={percentage}
                          onChange={(_, value) => handleSplitChange(person.id, value as number)}
                          min={0}
                          max={100}
                          sx={{ flex: 1 }}
                        />
                        <Typography sx={{ minWidth: 50 }}>{percentage}%</Typography>
                      </Box>
                    </Box>
                  );
                })}
              </>
            )}

            <TextField
              label="Observações"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingExpense ? 'Salvar' : 'Adicionar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Excluir Despesa Fixa"
        message={`Tem certeza que deseja excluir "${expenseToDelete?.description}"?`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </Box>
  );
}