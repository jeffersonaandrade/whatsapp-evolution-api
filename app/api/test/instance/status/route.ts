import { NextRequest, NextResponse } from 'next/server';
import { evolutionAPI } from '@/lib/evolution-api';
import { supabaseService } from '@/lib/services/supabase-service';

/**
 * Rota de TESTE - Obter status da instância (SEM autenticação)
 * ⚠️ REMOVER EM PRODUÇÃO
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instanceName = searchParams.get('instanceName');

    if (!instanceName) {
      return NextResponse.json(
        { error: 'instanceName é obrigatório' },
        { status: 400 }
      );
    }

    const instance = await supabaseService.getInstanceByName(instanceName);
    const evolutionStatus = await evolutionAPI.getInstanceStatus(instanceName);

    return NextResponse.json({
      instance: instance || null,
      evolutionState: evolutionStatus.data?.state,
      status: instance?.status || 'not_found',
    });
  } catch (error) {
    console.error('Erro ao buscar status da instância:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

