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
  // Usa o keyGenerator padrão que já lida com IPv6 corretamente
  // O express já considera X-Forwarded-For quando trust proxy está configurado
  handler: (req: Request, res: Response) => {
    const clientIp = req.ip || 'unknown';
    console.warn(`Rate limit exceeded for IP: ${clientIp}`);
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
  // Usa o keyGenerator padrão que já lida com IPv6 corretamente
});