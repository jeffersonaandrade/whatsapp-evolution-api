import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware para configurar CORS
 * Permite que o frontend (porta 3000) se comunique com o backend (porta 3001)
 * com suporte a cookies (credentials)
 */
export function middleware(request: NextRequest) {
  // Apenas aplicar CORS nas rotas de API
  if (!request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Obter origem permitida do env ou usar padrão
  const allowedOrigin = 
    process.env.NEXT_PUBLIC_FRONTEND_URL || 
    process.env.FRONTEND_URL || 
    'http://localhost:3000';

  // Obter origem da requisição
  const origin = request.headers.get('origin');

  // Verificar se a origem é permitida
  const isOriginAllowed = 
    !origin || // Permitir requisições sem origin (ex: Postman, curl)
    origin === allowedOrigin ||
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

  // Para outras requisições, adicionar headers CORS na resposta
  const response = NextResponse.next();
  
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

/**
 * Configuração do matcher para aplicar o middleware apenas nas rotas de API
 */
export const config = {
  matcher: '/api/:path*',
};

