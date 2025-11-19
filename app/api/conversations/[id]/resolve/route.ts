import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabase } from '@/lib/supabase';

/**
 * Resolver conversa
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createAuthenticatedSupabase();
    
    // Verificar autenticação
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const conversationId = params.id;

    // Buscar conversa
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 });
    }

    // Verificar permissão
    const { data: userData } = await supabase
      .from('users')
      .select('account_id')
      .eq('id', user.id)
      .single();

    // Type assertion necessário devido ao select do Supabase
    const conversationData = conversation as any;
    const instanceId = conversationData.instance_id;

    const { data: instance } = await supabase
      .from('instances')
      .select('account_id')
      .eq('id', instanceId)
      .single();

    // Type assertions para evitar erros de tipagem do Supabase
    const userAccountId = (userData as any)?.account_id;
    const instanceAccountId = (instance as any)?.account_id;

    if (userAccountId !== instanceAccountId) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    // Atualizar status da conversa
    const updateData: any = {
      status: 'resolved',
      updated_at: new Date().toISOString(),
    };
    const { data: updatedConversation, error: updateError } = await (supabase
      .from('conversations') as any)
      .update(updateData)
      .eq('id', conversationId)
      .select()
      .single();

    if (updateError || !updatedConversation) {
      return NextResponse.json(
        { error: 'Erro ao atualizar conversa' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      conversation: updatedConversation,
    });
  } catch (error) {
    console.error('Erro ao resolver conversa:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

