import { NextRequest, NextResponse } from 'next/server';
import { addSecurityHeaders } from '@/lib/utils/security';
import { checkRateLimit, getRateLimitKey } from '@/lib/utils/rate-limit';

/**
 * Middleware para configurar CORS, segurança e rate limiting
 */
export function middleware(request: NextRequest) {
  // Apenas aplicar nas rotas de API
  if (!request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Obter origem permitida do env ou usar padrão
  // Normaliza a URL removendo barra no final para comparação mais robusta
  const normalizeUrl = (url: string) => url.replace(/\/+$/, '');
  
  const allowedOrigin = 
    normalizeUrl(
      process.env.NEXT_PUBLIC_FRONTEND_URL || 
      process.env.FRONTEND_URL || 
      'http://localhost:3000'
    );

  // Obter origem da requisição
  const origin = request.headers.get('origin');
  const normalizedOrigin = origin ? normalizeUrl(origin) : null;

  // Verificar se a origem é permitida
  const isOriginAllowed = 
    !origin || // Permitir requisições sem origin (ex: Postman, curl)
    normalizedOrigin === allowedOrigin ||
    (process.env.NODE_ENV === 'development' && origin?.startsWith('http://localhost'));

  // Headers CORS
  const corsHeaders = {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': isOriginAllowed ? (origin || allowedOrigin) : allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': [
      'Content-Type',
      'Authorization',
      'Cookie',
      'X-CSRF-Token',
      'X-Requested-With',
      'Accept',
      'Accept-Version',
      'Content-Length',
      'Content-MD5',
      'Date',
      'X-Api-Version',
    ].join(', '),
    'Access-Control-Max-Age': '86400', // 24 horas
  };

  // Tratar requisição OPTIONS (preflight)
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Rate limiting (exceto health check)
  if (!request.nextUrl.pathname.includes('/health')) {
    const rateLimitKey = getRateLimitKey(request as any, undefined);
    const rateLimitResult = checkRateLimit(rateLimitKey, {
      windowMs: 60000, // 1 minuto
      maxRequests: 100, // 100 requisições por minuto
    });

    if (!rateLimitResult.allowed) {
      const response = new NextResponse(
        JSON.stringify({
          error: 'Muitas requisições. Tente novamente mais tarde.',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
      
      response.headers.set('Retry-After', Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString());
      
      // Aplicar CORS e headers de segurança mesmo em rate limit
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      addSecurityHeaders(response);
      
      return response;
    }
  }

  // Para outras requisições, adicionar headers CORS e de segurança
  const response = NextResponse.next();
  
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Aplicar headers de segurança
  addSecurityHeaders(response);

  return response;
}

/**
 * Configuração do matcher para aplicar o middleware apenas nas rotas de API
 */
export const config = {
  matcher: '/api/:path*',
};

