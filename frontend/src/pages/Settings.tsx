import React, { useState } from 'react';
import { Box, Typography, Card, CardContent, Button, TextField, IconButton, List, ListItem, ListItemText, ListItemSecondaryAction, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem, Chip, CircularProgress } from '@mui/material';
import Grid from '@mui/material/Grid';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Download as DownloadIcon, Upload as UploadIcon, LightMode as LightModeIcon, DarkMode as DarkModeIcon, SettingsBrightness as SystemModeIcon } from '@mui/icons-material';
import { v4 as uuidv4 } from 'uuid';
import { useApp } from '../contexts/AppContext';
import { useTheme } from '../theme';
import type { Category } from '../types';
import { generateRandomColor, DEFAULT_CATEGORIES } from '../utils';
import ColorPicker from '../components/common/ColorPicker';
import ConfirmDialog from '../components/common/ConfirmDialog';

export default function Settings() {
  const { state, addCategory, updateCategory, deleteCategory, importData, exportData, resetCategories } = useApp();
  const { mode, setMode } = useTheme();
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', color: generateRandomColor(), type: 'variable' as 'fixed' | 'variable' | 'both' });
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenCategoryDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({ name: category.name, color: category.color, type: category.type });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: '', color: generateRandomColor(), type: 'variable' });
    }
    setCategoryDialog(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, { 
          name: categoryForm.name.trim(), 
          color: categoryForm.color, 
          icon: editingCategory.icon,
          type: categoryForm.type 
        });
      } else {
        await addCategory({ 
          name: categoryForm.name.trim(), 
          color: categoryForm.color,
          icon: 'category',
          type: categoryForm.type,
        });
      }
      setCategoryDialog(false);
    } catch (error) {
      console.error('Error saving category:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = (category: Category) => {
    setCategoryToDelete(category);
    setDeleteDialog(true);
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await deleteCategory(categoryToDelete.id);
      setDeleteDialog(false);
      setCategoryToDelete(null);
    } catch (error) {
      console.error('Error deleting category:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportData = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const data = await exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `organizador-despesas-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Erro ao exportar dados');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || isSubmitting) return;
    setIsSubmitting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.people && data.expenses && data.categories) {
          await importData(data);
          alert('Dados importados com sucesso!');
        } else {
          alert('Formato de arquivo de backup inválido');
        }
      } catch {
        alert('Erro ao ler arquivo de backup');
      } finally {
        setIsSubmitting(false);
      }
    };
    reader.readAsText(file);
  };

  const handleResetCategories = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await resetCategories();
    } catch (error) {
      console.error('Error resetting categories:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getThemeIcon = (themeMode: string) => {
    switch (themeMode) {
      case 'light':
        return <LightModeIcon />;
      case 'dark':
        return <DarkModeIcon />;
      default:
        return <SystemModeIcon />;
    }
  };

  const getCategoryTypeLabel = (type: string) => {
    switch (type) {
      case 'fixed':
        return 'Fixa';
      case 'variable':
        return 'Variável';
      case 'both':
        return 'Ambas';
      default:
        return type;
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={600} mb={3}>Configurações</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" mb={2}>Aparência</Typography>
              <FormControl fullWidth>
                <InputLabel>Tema</InputLabel>
                <Select
                  value={mode}
                  label="Tema"
                  onChange={(e) => setMode(e.target.value as 'light' | 'dark' | 'system')}
                  startAdornment={getThemeIcon(mode)}
                >
                  <MenuItem value="light">
                    <Box display="flex" alignItems="center" gap={1}>
                      <LightModeIcon /> Claro
                    </Box>
                  </MenuItem>
                  <MenuItem value="dark">
                    <Box display="flex" alignItems="center" gap={1}>
                      <DarkModeIcon /> Escuro
                    </Box>
                  </MenuItem>
                  <MenuItem value="system">
                    <Box display="flex" alignItems="center" gap={1}>
                      <SystemModeIcon /> Sistema
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" mb={2}>Gerenciamento de Dados</Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button variant="outlined" startIcon={isSubmitting ? <CircularProgress size={20} /> : <DownloadIcon />} onClick={handleExportData} disabled={isSubmitting}>Exportar Dados</Button>
                <Button variant="outlined" startIcon={isSubmitting ? <CircularProgress size={20} /> : <UploadIcon />} component="label" disabled={isSubmitting}>
                  Importar Dados
                  <input type="file" hidden accept=".json" onChange={handleImportData} />
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Categorias</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button size="small" onClick={handleResetCategories} disabled={isSubmitting}>Restaurar Padrões</Button>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenCategoryDialog()} disabled={isSubmitting}>Adicionar Categoria</Button>
                </Box>
              </Box>
              <List>
                {state.categories.map((category) => (
                  <ListItem key={category.id} divider>
                    <Box sx={{ width: 24, height: 24, borderRadius: 1, bgcolor: category.color, mr: 2 }} />
                    <ListItemText 
                      primary={category.name} 
                      secondary={
                        <Chip 
                          label={getCategoryTypeLabel(category.type)} 
                          size="small" 
                          variant="outlined"
                          sx={{ mt: 0.5 }}
                        />
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton size="small" onClick={() => handleOpenCategoryDialog(category)}><EditIcon fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteCategory(category)}><DeleteIcon fontSize="small" /></IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={categoryDialog} onClose={() => setCategoryDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editingCategory ? 'Editar Categoria' : 'Adicionar Categoria'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <ColorPicker value={categoryForm.color} onChange={(color) => setCategoryForm({ ...categoryForm, color })} />
              <TextField label="Nome" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} fullWidth autoFocus />
            </Box>
            <FormControl fullWidth>
              <InputLabel>Tipo</InputLabel>
              <Select
                value={categoryForm.type}
                label="Tipo"
                onChange={(e) => setCategoryForm({ ...categoryForm, type: e.target.value as 'fixed' | 'variable' | 'both' })}
              >
                <MenuItem value="fixed">Despesa Fixa</MenuItem>
                <MenuItem value="variable">Despesa Variável</MenuItem>
                <MenuItem value="both">Ambas</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCategoryDialog(false)} color="inherit" disabled={isSubmitting}>Cancelar</Button>
          <Button onClick={handleSaveCategory} variant="contained" disabled={isSubmitting}>
            {isSubmitting ? <CircularProgress size={20} /> : (editingCategory ? 'Salvar' : 'Adicionar')}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deleteDialog}
        title="Excluir Categoria"
        message={`Tem certeza que deseja excluir "${categoryToDelete?.name}"?`}
        confirmText="Excluir"
        confirmColor="error"
        onConfirm={confirmDeleteCategory}
        onCancel={() => setDeleteDialog(false)}
      />
    </Box>
  );
}