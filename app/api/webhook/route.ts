import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/services/supabase-service';
import { logger } from '@/lib/utils/logger';
import type { EvolutionAPIWebhook, EvolutionAPIMessage } from '@/types';

/**
 * Webhook para receber eventos da Evolution API
 * Este webhook apenas recebe eventos e repassa para o projeto "cérebro"
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  try {
    logger.info('[Webhook] Recebendo webhook da Evolution API', { requestId });

    // Validação de webhook (HMAC ou Bearer token)
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (webhookSecret) {
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logger.warn('[Webhook] Tentativa de acesso sem autorização', { requestId });
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
      }

      const token = authHeader.replace('Bearer ', '');
      if (token !== webhookSecret) {
        logger.warn('[Webhook] Token inválido', { requestId });
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
      }
    }

    logger.debug('[Webhook] Fazendo parse do body', { requestId });
    const body: EvolutionAPIWebhook = await request.json();
    const { event, data } = body;

    logger.info('[Webhook] Evento recebido', { 
      requestId, 
      event, 
      instanceName: data?.instanceName,
      dataKeys: data ? Object.keys(data) : [],
    });

    // Processa eventos básicos (status de conexão, QR code)
    logger.debug('[Webhook] Processando evento', { requestId, event });
    switch (event) {
      case 'messages.upsert':
        logger.info('[Webhook] Processando mensagens recebidas', { requestId, instanceName: data.instanceName, messageCount: data.messages?.length || 0 });
        await handleMessagesUpsert(data.instanceName, data.messages || [], requestId);
        break;

      case 'connection.update':
        logger.info('[Webhook] Processando atualização de conexão', { requestId, instanceName: data.instanceName, state: data.state });
        await handleConnectionUpdate(data.instanceName, data.state, requestId);
        break;

      case 'qrcode.update':
        logger.info('[Webhook] Processando atualização de QR Code', { requestId, instanceName: data.instanceName });
        await handleQRCodeUpdate(data.instanceName, data.qrcode, requestId);
        break;

      default:
        logger.warn('[Webhook] Evento desconhecido', { requestId, event });
    }

    // Repassa evento para o projeto "cérebro" (se configurado)
    logger.debug('[Webhook] Repassando evento para projeto cérebro', { requestId });
    await forwardToBrainProject(body, requestId);

    const duration = Date.now() - startTime;
    logger.info('[Webhook] Webhook processado com sucesso', { requestId, event, duration: `${duration}ms` });

    return NextResponse.json({ success: true, requestId });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('[Webhook] Erro ao processar webhook', error, { 
      requestId, 
      duration: `${duration}ms`,
      errorStep: 'parse_body_or_process_event',
    });
    
    return NextResponse.json(
      { error: 'Erro ao processar webhook', requestId },
      { status: 500 }
    );
  }
}

/**
 * Repassa eventos para o projeto "cérebro"
 */
async function forwardToBrainProject(webhookData: EvolutionAPIWebhook, requestId: string) {
  const brainWebhookUrl = process.env.BRAIN_WEBHOOK_URL;
  
  if (!brainWebhookUrl) {
    logger.debug('[Webhook] BRAIN_WEBHOOK_URL não configurado, evento não será repassado', { requestId });
    return;
  }

  try {
    logger.debug('[Webhook] Repassando evento para projeto cérebro', { requestId, brainWebhookUrl });
    
    const response = await fetch(brainWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.BRAIN_WEBHOOK_SECRET || ''}`,
      },
      body: JSON.stringify(webhookData),
    });

    if (!response.ok) {
      logger.error('[Webhook] Erro ao repassar para projeto cérebro', undefined, {
        requestId,
        status: response.status,
        statusText: response.statusText,
        brainWebhookUrl,
      });
    } else {
      logger.info('[Webhook] Evento repassado com sucesso para projeto cérebro', { requestId });
    }
  } catch (error) {
    logger.error('[Webhook] Erro ao repassar evento para projeto cérebro', error, {
      requestId,
      brainWebhookUrl,
      errorStep: 'forward_to_brain',
    });
  }
}

/**
 * Processa mensagens recebidas
 * Apenas salva no banco e repassa para o projeto cérebro
 */
async function handleMessagesUpsert(instanceName: string, messages: EvolutionAPIMessage[], requestId: string) {
  try {
    logger.debug('[Webhook] Buscando instância no banco', { requestId, instanceName });
    
    // Busca instância
    const instance = await supabaseService.getInstanceByName(instanceName);

    if (!instance) {
      logger.error('[Webhook] Instância não encontrada', undefined, { requestId, instanceName, errorStep: 'instance_not_found' });
      return;
    }

    logger.info('[Webhook] Instância encontrada, processando mensagens', { 
      requestId, 
      instanceName, 
      instanceId: instance.id,
      messageCount: messages.length,
    });

    let processedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const messageId = `${requestId}-msg-${i}`;
      
      try {
        logger.debug('[Webhook] Processando mensagem', { requestId, messageId, fromMe: message.key.fromMe });

        // Ignora mensagens enviadas por nós
        if (message.key.fromMe) {
          logger.debug('[Webhook] Mensagem ignorada (enviada por nós)', { requestId, messageId });
          skippedCount++;
          continue;
        }

        const remoteJid = message.key.remoteJid;
        const phoneNumber = extractPhoneNumber(remoteJid);

        if (!phoneNumber) {
          logger.warn('[Webhook] Não foi possível extrair número de telefone', { requestId, messageId, remoteJid });
          skippedCount++;
          continue;
        }

        logger.debug('[Webhook] Buscando/criando contato', { requestId, messageId, phoneNumber });
        
        // Busca ou cria contato
        const contact = await supabaseService.findOrCreateContact(
          instance.account_id,
          phoneNumber,
          message.pushName
        );

        logger.debug('[Webhook] Buscando/criando conversa', { requestId, messageId, contactId: contact.id });

        // Busca ou cria conversa
        const conversation = await supabaseService.findOrCreateConversation(
          instance.id,
          contact.id,
          instance.account_id
        );

        // Extrai texto da mensagem
        const messageText = extractMessageText(message);

        logger.debug('[Webhook] Salvando mensagem no banco', { requestId, messageId, conversationId: conversation.id, hasText: !!messageText });

        // Salva mensagem recebida no banco
        await supabaseService.createMessage({
          conversation_id: conversation.id,
          from_me: false,
          body: messageText || '',
          timestamp: new Date(message.timestamp ? message.timestamp * 1000 : Date.now()).toISOString(),
          status: 'delivered',
          sent_by: 'customer',
        });

        logger.debug('[Webhook] Atualizando última mensagem da conversa', { requestId, messageId, conversationId: conversation.id });

        // Atualiza última mensagem da conversa
        await supabaseService.updateConversation(conversation.id, {
          last_message_at: new Date().toISOString(),
        });

        processedCount++;
        logger.debug('[Webhook] Mensagem processada com sucesso', { requestId, messageId });
      } catch (error) {
        logger.error('[Webhook] Erro ao processar mensagem individual', error, {
          requestId,
          messageId: `${requestId}-msg-${i}`,
          instanceName,
          errorStep: 'process_message',
        });
      }
    }

    logger.info('[Webhook] Mensagens processadas', { 
      requestId, 
      instanceName, 
      processedCount, 
      skippedCount, 
      totalMessages: messages.length,
    });
  } catch (error) {
    logger.error('[Webhook] Erro ao processar mensagens', error, {
      requestId,
      instanceName,
      errorStep: 'handle_messages_upsert',
    });
  }
}

/**
 * Processa atualização de conexão
 */
async function handleConnectionUpdate(instanceName: string, state?: string, requestId?: string) {
  try {
    logger.debug('[Webhook] Processando atualização de conexão', { requestId, instanceName, state });

    const statusMap: Record<string, 'connected' | 'disconnected' | 'connecting'> = {
      open: 'connected',
      close: 'disconnected',
      connecting: 'connecting',
    };

    const status = state ? statusMap[state] || 'disconnected' : 'disconnected';

    logger.debug('[Webhook] Buscando instância no banco', { requestId, instanceName });
    const instance = await supabaseService.getInstanceByName(instanceName);
    
    if (!instance) {
      logger.error('[Webhook] Instância não encontrada para atualizar status', undefined, {
        requestId,
        instanceName,
        state,
        errorStep: 'instance_not_found_for_connection_update',
      });
      return;
    }

    logger.debug('[Webhook] Atualizando status da instância no banco', { requestId, instanceName, instanceId: instance.id, status });
    await supabaseService.updateInstance(instance.id, { status });
    
    logger.info('[Webhook] Status da instância atualizado com sucesso', {
      requestId,
      instanceName,
      instanceId: instance.id,
      state,
      status,
    });
  } catch (error) {
    logger.error('[Webhook] Erro ao processar atualização de conexão', error, {
      requestId,
      instanceName,
      state,
      errorStep: 'handle_connection_update',
    });
  }
}

/**
 * Processa atualização de QR Code
 */
async function handleQRCodeUpdate(instanceName: string, qrcode?: any, requestId?: string) {
  try {
    logger.debug('[Webhook] Processando atualização de QR Code', { requestId, instanceName, qrcodeType: typeof qrcode });

    logger.debug('[Webhook] Buscando instância no banco', { requestId, instanceName });
    const instance = await supabaseService.getInstanceByName(instanceName);
    
    if (!instance) {
      logger.error('[Webhook] Instância não encontrada para salvar QR Code', undefined, {
        requestId,
        instanceName,
        errorStep: 'instance_not_found_for_qrcode',
      });
      return;
    }

    // Extrai o QR Code do payload (pode vir em diferentes formatos)
    let qrCodeBase64: string | null = null;
    
    logger.debug('[Webhook] Extraindo QR Code do payload', { 
      requestId, 
      instanceName, 
      qrcodeType: typeof qrcode,
      qrcodeKeys: qrcode ? Object.keys(qrcode) : [],
    });

    if (typeof qrcode === 'string') {
      qrCodeBase64 = qrcode;
      logger.debug('[Webhook] QR Code encontrado como string', { requestId, instanceName });
    } else if (qrcode?.base64) {
      qrCodeBase64 = qrcode.base64;
      logger.debug('[Webhook] QR Code encontrado em qrcode.base64', { requestId, instanceName });
    } else if (qrcode?.code) {
      qrCodeBase64 = qrcode.code;
      logger.debug('[Webhook] QR Code encontrado em qrcode.code', { requestId, instanceName });
    } else if (qrcode?.qrcode) {
      qrCodeBase64 = typeof qrcode.qrcode === 'string' ? qrcode.qrcode : qrcode.qrcode.base64 || qrcode.qrcode.code;
      logger.debug('[Webhook] QR Code encontrado em qrcode.qrcode', { requestId, instanceName });
    }

    if (qrCodeBase64) {
      logger.debug('[Webhook] Salvando QR Code no banco', { 
        requestId, 
        instanceName, 
        instanceId: instance.id,
        qrCodeLength: qrCodeBase64.length,
      });

      // Salva o QR Code no banco de dados
      await supabaseService.updateInstance(instance.id, {
        qr_code: qrCodeBase64,
        status: 'connecting', // Atualiza status para connecting quando recebe QR Code
      });
      
      logger.info('[Webhook] QR Code salvo com sucesso', {
        requestId,
        instanceName,
        instanceId: instance.id,
        qrCodeLength: qrCodeBase64.length,
      });
    } else {
      logger.warn('[Webhook] QR Code recebido mas formato inválido', {
        requestId,
        instanceName,
        qrcodeType: typeof qrcode,
        qrcodeKeys: qrcode ? Object.keys(qrcode) : [],
        qrcodeStringified: qrcode ? JSON.stringify(qrcode).substring(0, 200) : null,
      });
    }
  } catch (error) {
    logger.error('[Webhook] Erro ao processar atualização de QR Code', error, {
      requestId,
      instanceName,
      errorStep: 'handle_qrcode_update',
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
