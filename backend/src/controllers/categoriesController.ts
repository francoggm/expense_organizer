import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import type { Category, CategoryRow, ApiResponse } from '../models/types';

// Default categories in Portuguese
const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', name: 'Moradia', icon: 'Home', color: '#4CAF50', type: 'fixed' },
  { id: '2', name: 'Água', icon: 'Water', color: '#2196F3', type: 'fixed' },
  { id: '3', name: 'Luz', icon: 'ElectricBolt', color: '#FF9800', type: 'fixed' },
  { id: '4', name: 'Internet', icon: 'Wifi', color: '#9C27B0', type: 'fixed' },
  { id: '5', name: 'Telefone', icon: 'Phone', color: '#00BCD4', type: 'fixed' },
  { id: '6', name: 'Seguro', icon: 'Security', color: '#607D8B', type: 'fixed' },
  { id: '7', name: 'Assinaturas', icon: 'Subscriptions', color: '#E91E63', type: 'fixed' },
  { id: '8', name: 'Alimentação', icon: 'ShoppingCart', color: '#8BC34A', type: 'variable' },
  { id: '9', name: 'Restaurante', icon: 'Restaurant', color: '#FF5722', type: 'variable' },
  { id: '10', name: 'Transporte', icon: 'DirectionsCar', color: '#00BCD4', type: 'both' },
  { id: '11', name: 'Entretenimento', icon: 'Movie', color: '#673AB7', type: 'variable' },
  { id: '12', name: 'Compras', icon: 'ShoppingBag', color: '#F44336', type: 'variable' },
  { id: '13', name: 'Saúde', icon: 'LocalHospital', color: '#4DD0E1', type: 'both' },
  { id: '14', name: 'Educação', icon: 'School', color: '#3F51B5', type: 'both' },
  { id: '15', name: 'Viagem', icon: 'Flight', color: '#FFEB3B', type: 'variable' },
  { id: '16', name: 'Cuidados Pessoais', icon: 'Spa', color: '#E1BEE7', type: 'variable' },
  { id: '17', name: 'Presentes', icon: 'CardGiftcard', color: '#FF4081', type: 'variable' },
  { id: '18', name: 'Outros', icon: 'MoreHoriz', color: '#9E9E9E', type: 'both' },
];

// Convert database row to Category object
const rowToCategory = (row: CategoryRow): Category => ({
  id: row.id,
  name: row.name,
  icon: row.icon,
  color: row.color,
  type: row.type,
});

// Get all categories
export const getAll = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query('SELECT * FROM categories ORDER BY name ASC');
    
    // If no categories exist, insert defaults
    if (result.rows.length === 0) {
      for (const cat of DEFAULT_CATEGORIES) {
        await query(
          'INSERT INTO categories (id, name, icon, color, type) VALUES ($1, $2, $3, $4, $5)',
          [cat.id, cat.name, cat.icon, cat.color, cat.type]
        );
      }
      res.json({
        success: true,
        data: DEFAULT_CATEGORIES,
      } as ApiResponse<Category[]>);
      return;
    }

    const categories = result.rows.map(rowToCategory);

    res.json({
      success: true,
      data: categories,
    } as ApiResponse<Category[]>);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories',
    } as ApiResponse);
  }
};

// Get category by ID
export const getById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM categories WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Category not found',
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      data: rowToCategory(result.rows[0]),
    } as ApiResponse<Category>);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch category',
    } as ApiResponse);
  }
};

// Create new category
export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, icon, color, type } = req.body as Category;

    if (!name || !icon || !color || !type) {
      res.status(400).json({
        success: false,
        error: 'Name, icon, color, and type are required',
      } as ApiResponse);
      return;
    }

    const id = uuidv4();
    const result = await query(
      `INSERT INTO categories (id, name, icon, color, type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, name, icon, color, type]
    );

    res.status(201).json({
      success: true,
      data: rowToCategory(result.rows[0]),
    } as ApiResponse<Category>);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create category',
    } as ApiResponse);
  }
};

// Update category
export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, icon, color, type } = req.body as Category;

    if (!name || !icon || !color || !type) {
      res.status(400).json({
        success: false,
        error: 'Name, icon, color, and type are required',
      } as ApiResponse);
      return;
    }

    const result = await query(
      `UPDATE categories
       SET name = $1, icon = $2, color = $3, type = $4
       WHERE id = $5
       RETURNING *`,
      [name, icon, color, type, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Category not found',
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      data: rowToCategory(result.rows[0]),
    } as ApiResponse<Category>);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update category',
    } as ApiResponse);
  }
};

// Delete category
export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM categories WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Category not found',
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      message: 'Category deleted successfully',
    } as ApiResponse);
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete category',
    } as ApiResponse);
  }
};

// Reset categories to defaults
export const reset = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Delete all existing categories
    await query('DELETE FROM categories');

    // Insert default categories
    for (const cat of DEFAULT_CATEGORIES) {
      await query(
        'INSERT INTO categories (id, name, icon, color, type) VALUES ($1, $2, $3, $4, $5)',
        [cat.id, cat.name, cat.icon, cat.color, cat.type]
      );
    }

    res.json({
      success: true,
      data: DEFAULT_CATEGORIES,
      message: 'Categories reset to defaults',
    } as ApiResponse<Category[]>);
  } catch (error) {
    console.error('Error resetting categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset categories',
    } as ApiResponse);
  }
};