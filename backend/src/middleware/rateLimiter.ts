import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';

// Rate limiter específico para a rota de login
// Limita a 5 tentativas por IP a cada 15 minutos
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo 5 tentativas por janela
  message: {
    success: false,
    error: 'Too many login attempts. Please try again after 15 minutes.',
    retryAfter: 15 * 60, // segundos
  },
  standardHeaders: true, // Retorna rate limit info nos headers `RateLimit-*`
  legacyHeaders: false, // Desabilita headers `X-RateLimit-*`
  skipSuccessfulRequests: true, // Não conta requisições bem-sucedidas
  keyGenerator: (req: Request): string => {
    // Usa o IP real considerando proxies (nginx)
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
  handler: (req: Request, res: Response) => {
    console.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Too many login attempts. Please try again after 15 minutes.',
      retryAfter: 15 * 60,
    });
  },
});

// Rate limiter geral para a API (mais permissivo)
export const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // 100 requisições por minuto
  message: {
    success: false,
    error: 'Too many requests. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
});