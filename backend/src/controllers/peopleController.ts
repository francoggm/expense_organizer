import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import type { Person, PersonRow, PersonFormData, ApiResponse } from '../models/types';

// Convert database row to Person object
const rowToPerson = (row: PersonRow): Person => ({
  id: row.id,
  name: row.name,
  email: row.email || undefined,
  color: row.color,
  createdAt: row.created_at.toISOString(),
});

// Get all people
export const getAll = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query('SELECT * FROM people ORDER BY created_at ASC');
    const people = result.rows.map(rowToPerson);

    res.json({
      success: true,
      data: people,
    } as ApiResponse<Person[]>);
  } catch (error) {
    console.error('Error fetching people:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch people',
    } as ApiResponse);
  }
};

// Get person by ID
export const getById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM people WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Person not found',
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      data: rowToPerson(result.rows[0]),
    } as ApiResponse<Person>);
  } catch (error) {
    console.error('Error fetching person:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch person',
    } as ApiResponse);
  }
};

// Create new person
export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, color } = req.body as PersonFormData;

    if (!name || !color) {
      res.status(400).json({
        success: false,
        error: 'Name and color are required',
      } as ApiResponse);
      return;
    }

    const id = uuidv4();
    const result = await query(
      `INSERT INTO people (id, name, email, color, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [id, name, email || null, color]
    );

    res.status(201).json({
      success: true,
      data: rowToPerson(result.rows[0]),
    } as ApiResponse<Person>);
  } catch (error) {
    console.error('Error creating person:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create person',
    } as ApiResponse);
  }
};

// Update person
export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, email, color } = req.body as PersonFormData;

    if (!name || !color) {
      res.status(400).json({
        success: false,
        error: 'Name and color are required',
      } as ApiResponse);
      return;
    }

    const result = await query(
      `UPDATE people
       SET name = $1, email = $2, color = $3
       WHERE id = $4
       RETURNING *`,
      [name, email || null, color, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Person not found',
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      data: rowToPerson(result.rows[0]),
    } as ApiResponse<Person>);
  } catch (error) {
    console.error('Error updating person:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update person',
    } as ApiResponse);
  }
};

// Delete person
export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM people WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Person not found',
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      message: 'Person deleted successfully',
    } as ApiResponse);
  } catch (error) {
    console.error('Error deleting person:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete person',
    } as ApiResponse);
  }
};