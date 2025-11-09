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

    const { data: instance } = await supabase
      .from('instances')
      .select('account_id')
      .eq('id', conversation.instance_id)
      .single();

    if (userData?.account_id !== instance?.account_id) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    // Atualizar status da conversa
    const { data: updatedConversation, error: updateError } = await supabase
      .from('conversations')
      .update({
        status: 'resolved',
        updated_at: new Date().toISOString(),
      })
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

