import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { LoginRequest, ApiResponse, LoginResponse } from '../models/types';
import {
  recordFailedAttempt,
  clearFailedAttempts,
  addSecurityDelay,
} from '../middleware/bruteForceProtection';

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
      // Adiciona delay mesmo para requisições inválidas
      await addSecurityDelay();
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
      // Registra tentativa falha para proteção contra brute force
      recordFailedAttempt(req);
      
      // Adiciona delay para desacelerar ataques
      await addSecurityDelay();
      
      // Log da tentativa falha (sem expor a senha)
      const clientIp = req.headers['x-forwarded-for'] || req.ip || 'unknown';
      console.warn(`Failed login attempt from IP: ${clientIp}`);
      
      res.status(401).json({
        success: false,
        error: 'Invalid password',
      } as ApiResponse);
      return;
    }

    // Login bem-sucedido - limpa registro de tentativas falhas
    clearFailedAttempts(req);

    // Generate JWT token
    const expiresInSeconds = parseExpiresIn(jwtExpiresIn);
    const token = jwt.sign(
      { authenticated: true },
      jwtSecret,
      { expiresIn: expiresInSeconds }
    );

    const clientIp = req.headers['x-forwarded-for'] || req.ip || 'unknown';
    console.log(`Successful login from IP: ${clientIp}`);

    res.json({
      success: true,
      data: {
        token,
        expiresIn: jwtExpiresIn,
      },
    } as ApiResponse<LoginResponse>);
  } catch (error) {
    console.error('Login error:', error);
    
    // Adiciona delay mesmo em erros
    await addSecurityDelay();
    
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