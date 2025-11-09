import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabase } from '@/lib/supabase';
import { evolutionAPI } from '@/lib/evolution-api';

/**
 * Obter status da instância WhatsApp
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createAuthenticatedSupabase();
    
    // Verificar autenticação
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const instanceName = searchParams.get('instanceName');

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

    // Buscar status na Evolution API
    const evolutionStatus = await evolutionAPI.getInstanceStatus(instanceName);

    return NextResponse.json({
      status: instance.status,
      phoneNumber: instance.phone_number,
      profilePicUrl: instance.profile_pic_url,
      evolutionState: evolutionStatus.data?.state,
    });
  } catch (error) {
    console.error('Erro ao buscar status da instância:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

