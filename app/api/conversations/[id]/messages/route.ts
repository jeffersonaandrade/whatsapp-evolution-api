import { NextRequest, NextResponse } from 'next/server';
import { evolutionAPI } from '@/lib/evolution-api';
import { getAuthenticatedUser } from '@/lib/auth';
import { supabaseService } from '@/lib/services/supabase-service';

/**
 * Enviar mensagem em uma conversa
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user?.accountId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const conversationId = params.id;
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'text é obrigatório' }, { status: 400 });
    }

    // Buscar conversa
    const conversation = await supabaseService.getConversationById(conversationId);
    if (!conversation) {
      return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 });
    }

    // Verificar permissão: mesma conta
    const instance = await supabaseService.getInstanceById(conversation.instance_id);
    if (!instance || instance.account_id !== user.accountId) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    // Enviar mensagem via Evolution API
    const contact = await supabaseService.getContactById(conversation.contact_id);
    const instanceData = await supabaseService.getInstanceById(conversation.instance_id);
    if (!contact?.phone_number || !instanceData?.name) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    const phoneNumber = `${contact.phone_number}@s.whatsapp.net`;
    const result = await evolutionAPI.sendTextMessage(instanceData.name, phoneNumber, text);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Erro ao enviar mensagem', details: result.error },
        { status: 500 }
      );
    }

    // Salvar mensagem no SQLite
    const message = await supabaseService.createMessage({
      conversation_id: conversationId,
      from_me: true,
      body: text,
      timestamp: new Date().toISOString(),
      status: 'sent',
      sent_by: 'agent',
      agent_id: user.id,
    });

    // Atualizar última mensagem da conversa
    await supabaseService.updateConversation(conversationId, {
      last_message_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

