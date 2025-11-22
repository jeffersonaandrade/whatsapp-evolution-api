/**
 * Rate Limiting utilitário
 * Protege contra abuso e ataques de força bruta
 */

interface RateLimitConfig {
  windowMs: number; // Janela de tempo em milissegundos
  maxRequests: number; // Máximo de requisições por janela
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// Store simples em memória (em produção, usar Redis ou similar)
const store: RateLimitStore = {};

// Limpar entradas expiradas periodicamente
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 60000); // Limpar a cada minuto

/**
 * Verifica rate limit para uma chave (IP, userId, etc)
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig = { windowMs: 60000, maxRequests: 100 }
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = store[key];

  if (!entry || entry.resetTime < now) {
    // Nova entrada ou entrada expirada
    store[key] = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    };
  }

  // Entrada existe e está na janela
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  // Incrementa contador
  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Obtém chave de rate limit do request (IP, userId, etc)
 */
export function getRateLimitKey(request: Request, userId?: string): string {
  // Prioriza userId se disponível
  if (userId) {
    return `user:${userId}`;
  }

  // Fallback para IP
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown';
  
  return `ip:${ip}`;
}

