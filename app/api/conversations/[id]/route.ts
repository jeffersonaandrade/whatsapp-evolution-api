import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { supabaseService } from '@/lib/services/supabase-service';

/**
 * Obter conversa por ID
 */
export async function GET(
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

    // Buscar relações e mensagens
    const [contact, instance, messages] = await Promise.all([
      supabaseService.getContactById(conversation.contact_id),
      supabaseService.getInstanceById(conversation.instance_id),
      supabaseService.getMessagesByConversation(conversationId),
    ]);

    return NextResponse.json({
      ...conversation,
      contact: contact || null,
      instance: instance || null,
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

