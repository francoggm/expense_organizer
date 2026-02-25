import { useState, useMemo } from 'react';
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
  Slider,
  Checkbox,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ShoppingCart as ShoppingCartIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  CreditCard as CreditCardIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import { useApp, actions } from '../contexts/AppContext';
import type { Expense, ExpenseFormData } from '../types';
import {
  formatCurrency,
  formatDate,
  STATUS_CONFIG,
  PAYMENT_METHOD_LABELS,
  calculateSplitAmounts,
  getExpenseStatus,
} from '../utils';
import { v4 as uuidv4 } from 'uuid';
import { addMonths, format, startOfMonth, endOfMonth, parseISO, isBefore, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ConfirmDialog from '../components/common/ConfirmDialog';
import EmptyState from '../components/common/EmptyState';

const initialFormData: ExpenseFormData = {
  description: '',
  category: '',
  type: 'variable',
  totalAmount: 0,
  paymentMethod: 'pix',
  installments: 1,
  dueDate: new Date().toISOString().split('T')[0],
  paidById: '',
  splitBetween: [],
  isRecurring: false,
  isVariableAmount: false,
  notes: '',
};

export default function VariableExpenses() {
  const { state, dispatch, getPersonById } = useApp();
  const { expenses, people, categories } = state;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [formData, setFormData] = useState<ExpenseFormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof ExpenseFormData, string>>>({});
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [isSplit, setIsSplit] = useState(false);

  // Filter only variable expenses for the selected month
  const variableExpenses = useMemo(() => {
    const start = startOfMonth(selectedMonth);
    const end = endOfMonth(selectedMonth);
    
    return expenses.filter((e) => {
      if (e.type !== 'variable') return false;
      if (!e.dueDate) return false;
      
      const dueDate = parseISO(e.dueDate);
      return !isBefore(dueDate, start) && !isAfter(dueDate, end);
    });
  }, [expenses, selectedMonth]);

  // Get variable categories
  const variableCategories = useMemo(() => {
    return categories.filter((c) => c.type === 'variable' || c.type === 'both');
  }, [categories]);

  const handlePreviousMonth = () => {
    setSelectedMonth(addMonths(selectedMonth, -1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(addMonths(selectedMonth, 1));
  };

  const handleOpenDialog = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense);
      const hasSplit = expense.splitBetween.length > 1;
      setIsSplit(hasSplit);
      setFormData({
        description: expense.description,
        category: expense.category,
        type: 'variable',
        totalAmount: expense.totalAmount,
        paymentMethod: expense.paymentMethod,
        installments: expense.installments,
        dueDate: expense.dueDate,
        paidById: expense.paidById,
        splitBetween: expense.splitBetween.map((s) => ({
          personId: s.personId,
          percentage: s.percentage,
        })),
        isRecurring: false,
        isVariableAmount: false,
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
    if (formData.paymentMethod === 'credit' && formData.installments < 1) {
      newErrors.installments = 'Número de parcelas inválido';
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
        installments: formData.paymentMethod === 'credit' ? formData.installments : 1,
        dueDate: formData.dueDate,
        paidById: formData.paidById,
        splitBetween: splitAmounts.map((s, i) => ({
          ...s,
          isPaid: editingExpense.splitBetween[i]?.isPaid || false,
          paidAt: editingExpense.splitBetween[i]?.paidAt,
        })),
        notes: formData.notes,
      };
      dispatch(actions.updateExpense(updatedExpense));
    } else {
      // If credit with installments, create multiple expenses
      if (formData.paymentMethod === 'credit' && formData.installments > 1) {
        const groupId = uuidv4();
        const installmentAmount = formData.totalAmount / formData.installments;
        const installmentSplits = calculateSplitAmounts(installmentAmount, formData.splitBetween);
        const startDate = formData.dueDate ? new Date(formData.dueDate) : new Date();
        
        const installmentExpenses: Expense[] = [];
        for (let i = 0; i < formData.installments; i++) {
          const dueDate = addMonths(startDate, i);
          installmentExpenses.push({
            id: uuidv4(),
            description: `${formData.description} (${i + 1}/${formData.installments})`,
            category: formData.category,
            type: 'variable',
            totalAmount: installmentAmount,
            paymentMethod: 'credit',
            installments: formData.installments,
            currentInstallment: i + 1,
            installmentGroupId: groupId,
            dueDate: dueDate.toISOString(),
            paidById: formData.paidById,
            splitBetween: installmentSplits,
            status: 'pending',
            isRecurring: false,
            isVariableAmount: false,
            notes: formData.notes,
            createdAt: new Date().toISOString(),
          });
        }
        dispatch(actions.addExpenses(installmentExpenses));
      } else {
        const newExpense: Expense = {
          id: uuidv4(),
          description: formData.description,
          category: formData.category,
          type: 'variable',
          totalAmount: formData.totalAmount,
          paymentMethod: formData.paymentMethod,
          installments: 1,
          currentInstallment: 1,
          dueDate: formData.dueDate,
          paidById: formData.paidById,
          splitBetween: splitAmounts,
          status: 'pending',
          isRecurring: false,
          isVariableAmount: false,
          notes: formData.notes,
          createdAt: new Date().toISOString(),
        };
        dispatch(actions.addExpense(newExpense));
      }
    }

    handleCloseDialog();
  };

  const handleDeleteClick = (expense: Expense) => {
    setExpenseToDelete(expense);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (expenseToDelete) {
      if (expenseToDelete.installmentGroupId) {
        dispatch(actions.deleteExpensesByGroup(expenseToDelete.installmentGroupId));
      } else {
        dispatch(actions.deleteExpense(expenseToDelete.id));
      }
    }
    setDeleteDialogOpen(false);
    setExpenseToDelete(null);
  };

  const handleMarkAsPaid = (expense: Expense) => {
    const updatedExpense: Expense = {
      ...expense,
      status: 'paid',
      paidAt: new Date().toISOString(),
      splitBetween: expense.splitBetween.map((s) => ({
        ...s,
        isPaid: true,
        paidAt: new Date().toISOString(),
      })),
    };
    dispatch(actions.updateExpense(updatedExpense));
  };

  const handleMarkSplitPaid = (expenseId: string, personId: string, isPaid: boolean) => {
    dispatch(actions.markSplitPaid(expenseId, personId, isPaid));
  };

  const handleSplitChange = (personId: string, percentage: number) => {
    const currentSplits = [...formData.splitBetween];
    const existingIndex = currentSplits.findIndex((s) => s.personId === personId);
    
    if (existingIndex >= 0) {
      if (percentage === 0) {
        currentSplits.splice(existingIndex, 1);
      } else {
        currentSplits[existingIndex] = { personId, percentage };
      }
    } else if (percentage > 0) {
      currentSplits.push({ personId, percentage });
    }
    
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

  // Calculate month total
  const monthTotal = useMemo(() => {
    return variableExpenses.reduce((sum, e) => sum + e.totalAmount, 0);
  }, [variableExpenses]);

  if (people.length === 0) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Despesas Variáveis
        </Typography>
        <EmptyState
          icon={<ShoppingCartIcon sx={{ fontSize: 64 }} />}
          title="Cadastre pessoas primeiro"
          description="Você precisa cadastrar pelo menos uma pessoa antes de adicionar despesas."
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
          Despesas Variáveis
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: { xs: '100%', sm: 'auto' }, justifyContent: 'center' }}>
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
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, value) => value && setViewMode(value)}
              size="small"
              sx={{ ml: 1 }}
            >
              <ToggleButton value="cards">
                <ViewModuleIcon />
              </ToggleButton>
              <ToggleButton value="table">
                <ViewListIcon />
              </ToggleButton>
            </ToggleButtonGroup>
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

      {/* Month Summary */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Total: {formatCurrency(monthTotal)} • {variableExpenses.length} despesas
        </Typography>
      </Box>

      {variableExpenses.length === 0 ? (
        <EmptyState
          icon={<ShoppingCartIcon sx={{ fontSize: 64 }} />}
          title="Nenhuma despesa neste mês"
          description="Adicione suas compras e gastos variáveis."
          actionLabel="Adicionar Despesa"
          onAction={() => handleOpenDialog()}
        />
      ) : viewMode === 'cards' ? (
        <Grid container spacing={{ xs: 1.5, sm: 2 }}>
          {variableExpenses.map((expense) => {
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
                      <Chip label={expense.category} size="small" variant="outlined" />
                      <Chip
                        label={PAYMENT_METHOD_LABELS[expense.paymentMethod]}
                        size="small"
                        color={expense.paymentMethod === 'credit' ? 'secondary' : 'default'}
                        icon={expense.paymentMethod === 'credit' ? <CreditCardIcon /> : undefined}
                      />
                      {expense.dueDate && (
                        <Chip label={formatDate(expense.dueDate)} size="small" color="info" />
                      )}
                      {expense.installments > 1 && (
                        <Chip
                          label={`${expense.currentInstallment}/${expense.installments}x`}
                          size="small"
                          color="warning"
                        />
                      )}
                    </Box>

                    <Typography variant="body2" color="text.secondary" mb={1}>
                      Pago por: {payer?.name || 'Desconhecido'}
                    </Typography>

                    {expense.splitBetween.length > 1 && (
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
                                    sx={{ width: 24, height: 24, bgcolor: person?.color, fontSize: '0.75rem' }}
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
                                    onChange={(e) => handleMarkSplitPaid(expense.id, split.personId, e.target.checked)}
                                    color="success"
                                  />
                                </ListItemSecondaryAction>
                              </ListItem>
                            );
                          })}
                        </List>
                      </Box>
                    )}

                    {expense.splitBetween.length === 1 && (
                      <Box mt={2}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={expense.splitBetween[0]?.isPaid || false}
                              onChange={(e) => handleMarkSplitPaid(expense.id, expense.splitBetween[0].personId, e.target.checked)}
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
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Status</TableCell>
                <TableCell>Descrição</TableCell>
                <TableCell>Categoria</TableCell>
                <TableCell>Valor</TableCell>
                <TableCell>Pagamento</TableCell>
                <TableCell>Data</TableCell>
                <TableCell>Pago por</TableCell>
                <TableCell>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {variableExpenses.map((expense) => {
                const status = getExpenseStatus(expense);
                const payer = getPersonById(expense.paidById);

                return (
                  <TableRow key={expense.id}>
                    <TableCell>{getStatusIcon(status)}</TableCell>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell>{expense.category}</TableCell>
                    <TableCell>{formatCurrency(expense.totalAmount)}</TableCell>
                    <TableCell>
                      {PAYMENT_METHOD_LABELS[expense.paymentMethod]}
                      {expense.installments > 1 && ` (${expense.currentInstallment}/${expense.installments}x)`}
                    </TableCell>
                    <TableCell>{expense.dueDate ? formatDate(expense.dueDate) : '-'}</TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar sx={{ width: 24, height: 24, bgcolor: payer?.color, fontSize: '0.75rem' }}>
                          {payer?.name.charAt(0)}
                        </Avatar>
                        {payer?.name}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => handleOpenDialog(expense)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDeleteClick(expense)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
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
          {editingExpense ? 'Editar Despesa' : 'Nova Despesa Variável'}
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
              placeholder="Ex: Compra no mercado, Jantar, Eletrônico"
            />

            <FormControl fullWidth error={!!errors.category}>
              <InputLabel>Categoria</InputLabel>
              <Select
                value={formData.category}
                label="Categoria"
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {variableCategories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.name}>
                    {cat.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Valor Total"
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

            <FormControl fullWidth>
              <InputLabel>Forma de Pagamento</InputLabel>
              <Select
                value={formData.paymentMethod}
                label="Forma de Pagamento"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    paymentMethod: e.target.value as ExpenseFormData['paymentMethod'],
                    installments: e.target.value === 'credit' ? formData.installments : 1,
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

            {formData.paymentMethod === 'credit' && (
              <TextField
                label="Número de Parcelas"
                type="number"
                value={formData.installments === 0 ? '' : formData.installments}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData({ ...formData, installments: value === '' ? 0 : parseInt(value) });
                }}
                error={!!errors.installments}
                helperText={errors.installments || 'Apenas para pagamentos no crédito'}
                fullWidth
                inputProps={{ min: 1, max: 48 }}
              />
            )}

            <TextField
              label="Data de Vencimento"
              type="date"
              value={formData.dueDate?.split('T')[0] || ''}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <FormControl fullWidth error={!!errors.paidById}>
              <InputLabel>Quem Paga</InputLabel>
              <Select
                value={formData.paidById}
                label="Quem Paga"
                onChange={(e) => {
                  const newPaidById = e.target.value;
                  setFormData({ ...formData, paidById: newPaidById });
                  if (!isSplit) {
                    setFormData(prev => ({
                      ...prev,
                      paidById: newPaidById,
                      splitBetween: [{ personId: newPaidById, percentage: 100 }],
                    }));
                  }
                }}
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
              fullWidth
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {editingExpense ? 'Salvar' : 'Adicionar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Excluir Despesa"
        message={
          expenseToDelete?.installmentGroupId
            ? `Deseja excluir todas as ${expenseToDelete.installments} parcelas de "${expenseToDelete.description.split(' (')[0]}"?`
            : `Deseja excluir a despesa "${expenseToDelete?.description}"?`
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </Box>
  );
}
