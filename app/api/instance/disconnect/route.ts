import { NextRequest, NextResponse } from 'next/server';
import { evolutionAPI } from '@/lib/evolution-api';
import { getAuthenticatedUser } from '@/lib/auth';
import { supabaseService } from '@/lib/services/supabase-service';

/**
 * Desconectar instância WhatsApp
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user?.accountId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { instanceName } = await request.json();

    if (!instanceName) {
      return NextResponse.json({ error: 'instanceName é obrigatório' }, { status: 400 });
    }

    const instance = await supabaseService.getInstanceByName(instanceName);
    if (!instance || instance.account_id !== user.accountId) {
      return NextResponse.json({ error: 'Instância não encontrada' }, { status: 404 });
    }

    // Desconectar na Evolution API
    const result = await evolutionAPI.logoutInstance(instanceName);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Erro ao desconectar instância', details: result.error },
        { status: 500 }
      );
    }

    // Atualizar status no SQLite
    await supabaseService.updateInstance(instance.id, { status: 'disconnected' });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao desconectar instância:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

