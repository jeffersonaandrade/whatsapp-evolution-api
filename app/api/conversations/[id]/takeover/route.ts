import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { supabaseService } from '@/lib/services/supabase-service';

/**
 * Assumir conversa (takeover)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user?.accountId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const conversationId = params.id;

    // Buscar conversa
    const conversation = await supabaseService.getConversationById(conversationId);
    if (!conversation) {
      return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 });
    }

    // Verificar permissão
    const instance = await supabaseService.getInstanceById(conversation.instance_id);
    if (!instance || instance.account_id !== user.accountId) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    // Atualizar status da conversa
    const success = await supabaseService.updateConversation(conversationId, {
      status: 'in_service',
      assigned_to: user.id,
    });

    if (!success) return NextResponse.json({ error: 'Erro ao atualizar conversa' }, { status: 500 });

    return NextResponse.json({
      success: true,
      conversation: { ...conversation, status: 'in_service', assigned_to: user.id },
    });
  } catch (error) {
    console.error('Erro ao assumir conversa:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

