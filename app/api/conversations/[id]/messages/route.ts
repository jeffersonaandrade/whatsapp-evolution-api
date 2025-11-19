import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabase } from '@/lib/supabase';
import { evolutionAPI } from '@/lib/evolution-api';

/**
 * Enviar mensagem em uma conversa
 */
export async function POST(
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
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'text é obrigatório' }, { status: 400 });
    }

    // Buscar conversa
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select(`
        *,
        contact:contacts(*),
        instance:instances(*)
      `)
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 });
    }

    // Verificar se o usuário tem permissão (mesma conta)
    const { data: userData } = await supabase
      .from('users')
      .select('account_id')
      .eq('id', user.id)
      .single();

    // Type assertion necessário devido ao join no select anterior
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

    // Enviar mensagem via Evolution API
    const contact = conversationData.contact;
    const instanceData = conversationData.instance;
    
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

    // Salvar mensagem no Supabase
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        from_me: true,
        body: text,
        timestamp: new Date().toISOString(),
        status: 'sent',
        sent_by: 'agent',
        agent_id: user.id,
        created_at: new Date().toISOString(),
      } as any)
      .select()
      .single();

    if (msgError || !message) {
      console.error('Erro ao salvar mensagem:', msgError);
    }

    // Atualizar última mensagem da conversa
    await (supabase
      .from('conversations') as any)
      .update({
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

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

