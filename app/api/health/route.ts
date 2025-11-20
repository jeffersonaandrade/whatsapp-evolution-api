import { NextResponse } from 'next/server';

/**
 * Endpoint de Health Check simples para monitoramento (UptimeRobot, etc)
 * Sempre retorna 200 OK quando o serviço está online
 * 
 * Uso: Configure o UptimeRobot para chamar este endpoint
 * URL: https://whatsapp-evolution-api-fa3y.onrender.com/api/health
 */
export async function GET() {
  try {
    const uptime = process.uptime();
    const uptimeFormatted = formatUptime(uptime);

    return NextResponse.json(
      {
        status: 'ok',
        service: 'Motor (Next.js Backend)',
        uptime: uptime,
        uptimeFormatted: uptimeFormatted,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
      },
      { status: 200 }
    );
  } catch (error) {
    // Mesmo em caso de erro, retornamos 200 para indicar que o serviço está respondendo
    // O UptimeRobot vai detectar que o serviço está online
    return NextResponse.json(
      {
        status: 'ok',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  }
}

/**
 * Formata o uptime em formato legível (ex: "2h 30m 15s")
 */
function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0) parts.push(`${secs}s`);

  return parts.length > 0 ? parts.join(' ') : '0s';
}

