import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { LoginRequest, ApiResponse, LoginResponse } from '../models/types';

// Hash the access password on startup for comparison
let hashedPassword: string | null = null;

const initializePassword = async (): Promise<void> => {
  const accessPassword = process.env.ACCESS_PASSWORD;
  if (accessPassword) {
    hashedPassword = await bcrypt.hash(accessPassword, 10);
  }
};

// Initialize on module load
initializePassword();

// Parse expires in string to seconds
const parseExpiresIn = (expiresIn: string): number => {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) {
    return 7 * 24 * 60 * 60; // Default 7 days in seconds
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 60 * 60;
    case 'd': return value * 24 * 60 * 60;
    default: return 7 * 24 * 60 * 60;
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { password } = req.body as LoginRequest;

    if (!password) {
      res.status(400).json({
        success: false,
        error: 'Password is required',
      } as ApiResponse);
      return;
    }

    const accessPassword = process.env.ACCESS_PASSWORD;
    const jwtSecret = process.env.JWT_SECRET;
    const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';

    if (!accessPassword || !jwtSecret) {
      console.error('ACCESS_PASSWORD or JWT_SECRET not configured');
      res.status(500).json({
        success: false,
        error: 'Server configuration error',
      } as ApiResponse);
      return;
    }

    // Direct comparison (simpler for single password system)
    const isValid = password === accessPassword;

    if (!isValid) {
      res.status(401).json({
        success: false,
        error: 'Invalid password',
      } as ApiResponse);
      return;
    }

    // Generate JWT token
    const expiresInSeconds = parseExpiresIn(jwtExpiresIn);
    const token = jwt.sign(
      { authenticated: true },
      jwtSecret,
      { expiresIn: expiresInSeconds }
    );

    res.json({
      success: true,
      data: {
        token,
        expiresIn: jwtExpiresIn,
      },
    } as ApiResponse<LoginResponse>);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as ApiResponse);
  }
};

export const verify = async (req: Request, res: Response): Promise<void> => {
  // If we reach here, the auth middleware has already validated the token
  res.json({
    success: true,
    data: { authenticated: true },
  } as ApiResponse<{ authenticated: boolean }>);
};

export const logout = async (_req: Request, res: Response): Promise<void> => {
  // For JWT-based auth, logout is handled client-side by removing the token
  // This endpoint is just for API completeness
  res.json({
    success: true,
    message: 'Logged out successfully',
  } as ApiResponse);
};