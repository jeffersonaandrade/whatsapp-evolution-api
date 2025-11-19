import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabase } from '@/lib/supabase';

/**
 * Obter conversa por ID
 */
export async function GET(
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

    // Buscar conversa com relacionamentos
    const { data: conversation, error } = await supabase
      .from('conversations')
      .select(`
        *,
        contact:contacts(*),
        instance:instances(*)
      `)
      .eq('id', conversationId)
      .single();

    if (error || !conversation) {
      return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 });
    }

    // Buscar mensagens
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    // Type assertion necessário devido ao join no select anterior
    const conversationData = conversation as any;

    return NextResponse.json({
      ...conversationData,
      messages: messages || [],
    });
  } catch (error) {
    console.error('Erro ao buscar conversa:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

