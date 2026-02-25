import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Typography,
  Avatar,
  Chip,
  Tooltip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import { v4 as uuidv4 } from 'uuid';
import { useApp, actions } from '../contexts/AppContext';
import type { Person, PersonFormData } from '../types';
import { generateRandomColor, formatCurrency } from '../utils';
import ColorPicker from '../components/common/ColorPicker';
import ConfirmDialog from '../components/common/ConfirmDialog';
import EmptyState from '../components/common/EmptyState';

const initialFormData: PersonFormData = {
  name: '',
  email: '',
  color: generateRandomColor(),
};

export default function People() {
  const { state, dispatch } = useApp();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [personToDelete, setPersonToDelete] = useState<Person | null>(null);
  const [formData, setFormData] = useState<PersonFormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<PersonFormData>>({});

  const handleOpenDialog = (person?: Person) => {
    if (person) {
      setEditingPerson(person);
      setFormData({
        name: person.name,
        email: person.email || '',
        color: person.color,
      });
    } else {
      setEditingPerson(null);
      setFormData({ ...initialFormData, color: generateRandomColor() });
    }
    setErrors({});
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingPerson(null);
    setFormData(initialFormData);
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<PersonFormData> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Formato de email inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    if (editingPerson) {
      const updatedPerson: Person = {
        ...editingPerson,
        name: formData.name.trim(),
        email: formData.email?.trim() || undefined,
        color: formData.color,
      };
      dispatch(actions.updatePerson(updatedPerson));
    } else {
      const newPerson: Person = {
        id: uuidv4(),
        name: formData.name.trim(),
        email: formData.email?.trim() || undefined,
        color: formData.color,
        createdAt: new Date().toISOString(),
      };
      dispatch(actions.addPerson(newPerson));
    }

    handleCloseDialog();
  };

  const handleDeleteClick = (person: Person) => {
    setPersonToDelete(person);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (personToDelete) {
      dispatch(actions.deletePerson(personToDelete.id));
    }
    setDeleteDialogOpen(false);
    setPersonToDelete(null);
  };

  const getPersonExpenseTotal = (personId: string): number => {
    return state.expenses
      .filter((e) => e.paidById === personId)
      .reduce((sum, e) => sum + e.totalAmount, 0);
  };

  const getPersonExpenseCount = (personId: string): number => {
    // Filter expenses by person
    const personExpenses = state.expenses.filter((e) => e.paidById === personId);
    
    // Group by installmentGroupId to count installment purchases as one expense
    const uniqueExpenses = new Set<string>();
    let count = 0;
    
    personExpenses.forEach((expense) => {
      if (expense.installmentGroupId) {
        // If it's part of an installment group, only count it once
        if (!uniqueExpenses.has(expense.installmentGroupId)) {
          uniqueExpenses.add(expense.installmentGroupId);
          count++;
        }
      } else {
        // If it's not part of an installment group, count it normally
        count++;
      }
    });
    
    return count;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Pessoas
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Adicionar Pessoa
        </Button>
      </Box>

      {state.people.length === 0 ? (
        <Card>
          <EmptyState
            icon={<PeopleIcon />}
            title="Nenhuma pessoa cadastrada"
            description="Adicione pessoas para controlar quem paga as despesas e dividir os custos entre elas."
            actionLabel="Adicionar Pessoa"
            onAction={() => handleOpenDialog()}
          />
        </Card>
      ) : (
        <Grid container spacing={3}>
          {state.people.map((person) => (
            <Grid item xs={12} sm={6} md={4} key={person.id}>
              <Card
                sx={{
                  height: '100%',
                  borderTop: 4,
                  borderColor: person.color,
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                    <Avatar
                      sx={{
                        bgcolor: person.color,
                        width: 56,
                        height: 56,
                        fontSize: '1.5rem',
                        mr: 2,
                      }}
                    >
                      {person.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" fontWeight={600}>
                        {person.name}
                      </Typography>
                      {person.email && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                          <EmailIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            {person.email}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                    <Box>
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => handleOpenDialog(person)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteClick(person)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                      label={`${getPersonExpenseCount(person.id)} despesas`}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={formatCurrency(getPersonExpenseTotal(person.id))}
                      size="small"
                      color="primary"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingPerson ? 'Editar Pessoa' : 'Adicionar Nova Pessoa'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <ColorPicker
                value={formData.color}
                onChange={(color) => setFormData({ ...formData, color })}
                size="large"
              />
              <TextField
                label="Nome"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={!!errors.name}
                helperText={errors.name}
                fullWidth
                autoFocus
              />
            </Box>
            <TextField
              label="Email (opcional)"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={!!errors.email}
              helperText={errors.email}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingPerson ? 'Salvar' : 'Adicionar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Excluir Pessoa"
        message={`Tem certeza que deseja excluir "${personToDelete?.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        confirmColor="error"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </Box>
  );
}