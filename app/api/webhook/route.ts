import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/services/supabase-service';
import type { EvolutionAPIWebhook, EvolutionAPIMessage } from '@/types';

/**
 * Webhook para receber eventos da Evolution API
 * Este webhook apenas recebe eventos e repassa para o projeto "cérebro"
 */
export async function POST(request: NextRequest) {
  try {
    // Validação de webhook desabilitada por enquanto para facilitar testes
    // TODO: Habilitar validação em produção
    // const webhookSecret = process.env.WEBHOOK_SECRET;
    // if (webhookSecret) {
    //   const authHeader = request.headers.get('authorization');
    //   if (authHeader !== `Bearer ${webhookSecret}`) {
    //     return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    //   }
    // }

    const body: EvolutionAPIWebhook = await request.json();
    const { event, data } = body;

    console.log(`[Webhook] Evento recebido: ${event}`, { instanceName: data.instanceName });

    // Processa eventos básicos (status de conexão, QR code)
    switch (event) {
      case 'messages.upsert':
        await handleMessagesUpsert(data.instanceName, data.messages || []);
        break;

      case 'connection.update':
        await handleConnectionUpdate(data.instanceName, data.state);
        break;

      case 'qrcode.update':
        await handleQRCodeUpdate(data.instanceName, data.qrcode);
        break;

      default:
        console.warn(`[Webhook] Evento desconhecido: ${event}`);
    }

    // Repassa evento para o projeto "cérebro" (se configurado)
    await forwardToBrainProject(body);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Webhook] Erro ao processar webhook:', error);
    return NextResponse.json(
      { error: 'Erro ao processar webhook' },
      { status: 500 }
    );
  }
}

/**
 * Repassa eventos para o projeto "cérebro"
 */
async function forwardToBrainProject(webhookData: EvolutionAPIWebhook) {
  const brainWebhookUrl = process.env.BRAIN_WEBHOOK_URL;
  
  if (!brainWebhookUrl) {
    console.log('[Webhook] BRAIN_WEBHOOK_URL não configurado, evento não será repassado');
    return;
  }

  try {
    const response = await fetch(brainWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.BRAIN_WEBHOOK_SECRET || ''}`,
      },
      body: JSON.stringify(webhookData),
    });

    if (!response.ok) {
      console.error(`[Webhook] Erro ao repassar para projeto cérebro: ${response.status}`);
    } else {
      console.log('[Webhook] Evento repassado com sucesso para projeto cérebro');
    }
  } catch (error) {
    console.error('[Webhook] Erro ao repassar evento para projeto cérebro:', error);
  }
}

/**
 * Processa mensagens recebidas
 * Apenas salva no banco e repassa para o projeto cérebro
 */
async function handleMessagesUpsert(instanceName: string, messages: EvolutionAPIMessage[]) {
  // Busca instância
  const instance = await supabaseService.getInstanceByName(instanceName);

  if (!instance) {
    console.error(`[Webhook] Instância não encontrada: ${instanceName}`);
    return;
  }

  for (const message of messages) {
    // Ignora mensagens enviadas por nós
    if (message.key.fromMe) {
      continue;
    }

    const remoteJid = message.key.remoteJid;
    const phoneNumber = extractPhoneNumber(remoteJid);

    if (!phoneNumber) {
      continue;
    }

    // Busca ou cria contato
    const contact = await supabaseService.findOrCreateContact(
      instance.account_id,
      phoneNumber,
      message.pushName
    );

    // Busca ou cria conversa
    const conversation = await supabaseService.findOrCreateConversation(
      instance.id,
      contact.id,
      instance.account_id
    );

    // Extrai texto da mensagem
    const messageText = extractMessageText(message);

    // Salva mensagem recebida no banco
    await supabaseService.createMessage({
      conversation_id: conversation.id,
      from_me: false,
      body: messageText || '',
      timestamp: new Date(message.timestamp ? message.timestamp * 1000 : Date.now()).toISOString(),
      status: 'delivered',
      sent_by: 'customer',
    });

    // Atualiza última mensagem da conversa
    await supabaseService.updateConversation(conversation.id, {
      last_message_at: new Date().toISOString(),
    });
  }
}

/**
 * Processa atualização de conexão
 */
async function handleConnectionUpdate(instanceName: string, state?: string) {
  const statusMap: Record<string, 'connected' | 'disconnected' | 'connecting'> = {
    open: 'connected',
    close: 'disconnected',
    connecting: 'connecting',
  };

  const status = state ? statusMap[state] || 'disconnected' : 'disconnected';

  const instance = await supabaseService.getInstanceByName(instanceName);
  if (instance) {
    await supabaseService.updateInstance(instance.id, { status });
    console.log(`[Webhook] Status da instância ${instanceName} atualizado para: ${status}`);
  }
}

/**
 * Processa atualização de QR Code
 */
async function handleQRCodeUpdate(instanceName: string, qrcode?: any) {
  const instance = await supabaseService.getInstanceByName(instanceName);
  
  if (!instance) {
    console.error(`[Webhook] Instância não encontrada: ${instanceName}`);
    return;
  }

  // Extrai o QR Code do payload (pode vir em diferentes formatos)
  let qrCodeBase64: string | null = null;
  
  if (typeof qrcode === 'string') {
    qrCodeBase64 = qrcode;
  } else if (qrcode?.base64) {
    qrCodeBase64 = qrcode.base64;
  } else if (qrcode?.code) {
    qrCodeBase64 = qrcode.code;
  } else if (qrcode?.qrcode) {
    qrCodeBase64 = typeof qrcode.qrcode === 'string' ? qrcode.qrcode : qrcode.qrcode.base64 || qrcode.qrcode.code;
  }

  if (qrCodeBase64) {
    // Salva o QR Code no banco de dados
    await supabaseService.updateInstance(instance.id, {
      qr_code: qrCodeBase64,
      status: 'connecting', // Atualiza status para connecting quando recebe QR Code
    });
    
    console.log(`[Webhook] QR Code salvo para instância: ${instanceName}`, {
      hasQRCode: true,
      qrCodeLength: qrCodeBase64.length,
    });
  } else {
    console.warn(`[Webhook] QR Code recebido mas formato inválido para instância: ${instanceName}`, {
      qrcodeType: typeof qrcode,
      qrcodeKeys: qrcode ? Object.keys(qrcode) : [],
    });
  }
}


/**
 * Extrai número de telefone do JID
 */
function extractPhoneNumber(remoteJid: string): string | null {
  // Remove @s.whatsapp.net ou @g.us
  const match = remoteJid.match(/^(\d+)@/);
  return match ? match[1] : null;
}

/**
 * Extrai texto da mensagem
 */
function extractMessageText(message: EvolutionAPIMessage): string | null {
  if (message.message?.conversation) {
    return message.message.conversation;
  }
  
  if (message.message?.extendedTextMessage?.text) {
    return message.message.extendedTextMessage.text;
  }
  
  if (message.message?.imageMessage?.caption) {
    return message.message.imageMessage.caption;
  }
  
  return null;
}
