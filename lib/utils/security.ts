/**
 * Utilitários de segurança
 * Headers de segurança, validação de webhook, etc
 */

import { NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Adiciona headers de segurança à resposta
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevenir clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  
  // Prevenir MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Política de referrer
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy (ajustar conforme necessário)
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
  );

  // Prevenir cache de dados sensíveis
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  return response;
}

/**
 * Valida assinatura de webhook (HMAC)
 */
export function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const hmac = crypto.createHmac('sha256', secret);
    const calculatedSignature = hmac.update(payload).digest('hex');
    
    // Comparação segura para evitar timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(calculatedSignature),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}

/**
 * Gera token seguro aleatório
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Valida formato de token
 */
export function validateTokenFormat(token: string, minLength: number = 16): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(token) && token.length >= minLength;
}

/**
 * Sanitiza headers da requisição para logging (remove dados sensíveis)
 */
export function sanitizeHeadersForLogging(headers: Headers): Record<string, string> {
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'apikey'];
  const sanitized: Record<string, string> = {};

  headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (sensitiveHeaders.includes(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  });

  return sanitized;
}

/**
 * Valida origem permitida para CORS
 */
export function isAllowedOrigin(origin: string | null, allowedOrigins: string[]): boolean {
  if (!origin) {
    return false;
  }

  return allowedOrigins.some((allowed) => {
    // Suporte para wildcard
    if (allowed.includes('*')) {
      const pattern = allowed.replace(/\*/g, '.*');
      return new RegExp(`^${pattern}$`).test(origin);
    }

    return origin === allowed || origin.startsWith(allowed);
  });
}

/**
 * Valida tamanho máximo do body
 */
export function validateMaxBodySize(size: number, maxSize: number = 5 * 1024 * 1024): boolean {
  return size <= maxSize;
}

/**
 * Extrai IP real do request (considerando proxies)
 */
export function getRealIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  return 'unknown';
}

