import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabase } from '@/lib/supabase';
import { evolutionAPI } from '@/lib/evolution-api';

/**
 * Desconectar instância WhatsApp
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createAuthenticatedSupabase();
    
    // Verificar autenticação
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { instanceName } = await request.json();

    if (!instanceName) {
      return NextResponse.json({ error: 'instanceName é obrigatório' }, { status: 400 });
    }

    // Verificar se a instância pertence ao usuário
    const { data: userData } = await supabase
      .from('users')
      .select('account_id')
      .eq('id', user.id)
      .single();

    if (!userData?.account_id) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });
    }

    const { data: instance } = await supabase
      .from('instances')
      .select('*')
      .eq('name', instanceName)
      .eq('account_id', userData.account_id)
      .single();

    if (!instance) {
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

    // Atualizar status no Supabase
    await supabase
      .from('instances')
      .update({
        status: 'disconnected',
        updated_at: new Date().toISOString(),
      })
      .eq('id', instance.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao desconectar instância:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

