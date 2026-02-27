import type { Request, Response, NextFunction } from 'express';

interface FailedAttempt {
  count: number;
  lastAttempt: number;
  blockedUntil: number;
}

// Armazena tentativas falhas por IP (em memória)
// Em produção com múltiplas instâncias, considere usar Redis
const failedAttempts = new Map<string, FailedAttempt>();

// Configuração de bloqueio progressivo
const BLOCK_THRESHOLDS = [
  { attempts: 3, blockDuration: 0 },           // 1-3 falhas: sem bloqueio
  { attempts: 5, blockDuration: 60 * 1000 },   // 4-5 falhas: 1 minuto
  { attempts: 7, blockDuration: 5 * 60 * 1000 }, // 6-7 falhas: 5 minutos
  { attempts: 9, blockDuration: 15 * 60 * 1000 }, // 8-9 falhas: 15 minutos
  { attempts: Infinity, blockDuration: 60 * 60 * 1000 }, // 10+ falhas: 1 hora
];

// Tempo para resetar o contador de falhas (24 horas)
const RESET_TIME = 24 * 60 * 60 * 1000;

// Obtém o IP real do cliente
const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
};

// Calcula a duração do bloqueio baseado no número de tentativas
const getBlockDuration = (attempts: number): number => {
  for (const threshold of BLOCK_THRESHOLDS) {
    if (attempts <= threshold.attempts) {
      return threshold.blockDuration;
    }
  }
  return BLOCK_THRESHOLDS[BLOCK_THRESHOLDS.length - 1].blockDuration;
};

// Middleware de proteção contra brute force
export const bruteForceProtection = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const ip = getClientIp(req);
  const now = Date.now();
  const attempt = failedAttempts.get(ip);

  // Se não há registro de tentativas, permite
  if (!attempt) {
    next();
    return;
  }

  // Reseta se passou muito tempo desde a última tentativa
  if (now - attempt.lastAttempt > RESET_TIME) {
    failedAttempts.delete(ip);
    next();
    return;
  }

  // Verifica se ainda está bloqueado
  if (attempt.blockedUntil > now) {
    const remainingTime = Math.ceil((attempt.blockedUntil - now) / 1000);
    const remainingMinutes = Math.ceil(remainingTime / 60);
    
    console.warn(`Blocked IP ${ip} attempted login. Remaining block time: ${remainingTime}s`);
    
    res.status(429).json({
      success: false,
      error: `Too many failed attempts. Please try again in ${remainingMinutes} minute(s).`,
      retryAfter: remainingTime,
      blockedUntil: attempt.blockedUntil,
    });
    return;
  }

  next();
};

// Registra uma tentativa falha de login
export const recordFailedAttempt = (req: Request): void => {
  const ip = getClientIp(req);
  const now = Date.now();
  const attempt = failedAttempts.get(ip);

  if (!attempt) {
    failedAttempts.set(ip, {
      count: 1,
      lastAttempt: now,
      blockedUntil: 0,
    });
    return;
  }

  // Reseta se passou muito tempo
  if (now - attempt.lastAttempt > RESET_TIME) {
    failedAttempts.set(ip, {
      count: 1,
      lastAttempt: now,
      blockedUntil: 0,
    });
    return;
  }

  // Incrementa contador
  attempt.count++;
  attempt.lastAttempt = now;

  // Calcula novo tempo de bloqueio
  const blockDuration = getBlockDuration(attempt.count);
  if (blockDuration > 0) {
    attempt.blockedUntil = now + blockDuration;
    console.warn(`IP ${ip} blocked for ${blockDuration / 1000}s after ${attempt.count} failed attempts`);
  }

  failedAttempts.set(ip, attempt);
};

// Limpa o registro de tentativas falhas após login bem-sucedido
export const clearFailedAttempts = (req: Request): void => {
  const ip = getClientIp(req);
  failedAttempts.delete(ip);
  console.log(`Cleared failed attempts for IP ${ip} after successful login`);
};

// Adiciona delay artificial para desacelerar ataques
export const addSecurityDelay = (): Promise<void> => {
  // Delay aleatório entre 1 e 3 segundos
  const delay = 1000 + Math.random() * 2000;
  return new Promise((resolve) => setTimeout(resolve, delay));
};

// Limpa entradas antigas periodicamente (a cada hora)
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [ip, attempt] of failedAttempts.entries()) {
    if (now - attempt.lastAttempt > RESET_TIME) {
      failedAttempts.delete(ip);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`Cleaned ${cleaned} old brute force protection entries`);
  }
}, 60 * 60 * 1000);

// Exporta estatísticas para monitoramento
export const getBruteForceStats = (): {
  totalTrackedIPs: number;
  blockedIPs: number;
} => {
  const now = Date.now();
  let blockedCount = 0;
  
  for (const attempt of failedAttempts.values()) {
    if (attempt.blockedUntil > now) {
      blockedCount++;
    }
  }
  
  return {
    totalTrackedIPs: failedAttempts.size,
    blockedIPs: blockedCount,
  };
};