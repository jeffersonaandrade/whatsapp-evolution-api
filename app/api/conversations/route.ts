import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabase } from '@/lib/supabase';

/**
 * Listar conversas
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
    const instanceId = searchParams.get('instanceId');
    const status = searchParams.get('status');

    // Buscar account_id do usuário
    const { data: userData } = await supabase
      .from('users')
      .select('account_id')
      .eq('id', user.id)
      .single();

    if (!userData?.account_id) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });
    }

    // Buscar instâncias do usuário
    const { data: instances } = await supabase
      .from('instances')
      .select('id')
      .eq('account_id', userData.account_id);

    const instanceIds = instances?.map(i => i.id) || [];

    if (instanceIds.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    // Construir query
    let query = supabase
      .from('conversations')
      .select(`
        *,
        contact:contacts(*),
        instance:instances(*)
      `)
      .in('instance_id', instanceIds)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (instanceId) {
      query = query.eq('instance_id', instanceId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: conversations, error } = await query;

    if (error) {
      console.error('Erro ao buscar conversas:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar conversas' },
        { status: 500 }
      );
    }

    return NextResponse.json({ conversations: conversations || [] });
  } catch (error) {
    console.error('Erro ao listar conversas:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

