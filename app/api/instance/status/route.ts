import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { evolutionAPI } from '@/lib/evolution-api';
import { getAuthenticatedUser } from '@/lib/auth';

/**
 * Utilitário para logs estruturados
 */
function log(level: 'info' | 'warn' | 'error', message: string, context?: Record<string, any>) {
  const timestamp = new Date().toISOString();
  
  if (level === 'error') {
    console.error(`[${timestamp}] [ERROR] ${message}`, context || '');
  } else if (level === 'warn') {
    console.warn(`[${timestamp}] [WARN] ${message}`, context || '');
  } else {
    console.log(`[${timestamp}] [INFO] ${message}`, context || '');
  }
}

/**
 * Obter status da instância WhatsApp
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    log('info', 'Buscando status da instância', { requestId });

    // Verificar autenticação via cookies
    const user = await getAuthenticatedUser(request);
    
    if (!user || !user.accountId) {
      log('warn', 'Tentativa de buscar status sem autenticação', { requestId });
      return NextResponse.json(
        { error: 'Não autenticado', requestId },
        { status: 401 }
      );
    }

    log('info', 'Usuário autenticado', {
      requestId,
      userId: user.id,
      accountId: user.accountId,
    });

    const { searchParams } = new URL(request.url);
    const instanceName = searchParams.get('instanceName');

    const supabase = createServerSupabase();

    let instance: any = null;

    // Se instanceName foi fornecido, buscar por account_id e name
    // Se não, buscar a primeira instância do usuário
    if (instanceName) {
      log('info', 'Buscando instância no Supabase por name', {
        requestId,
        accountId: user.accountId,
        instanceName,
      });

      const { data, error: queryError } = await supabase
        .from('instances')
        .select('*')
        .eq('account_id', user.accountId)
        .eq('name', instanceName)
        .maybeSingle();

      if (queryError) {
        log('error', 'Erro ao buscar instância no Supabase', {
          requestId,
          accountId: user.accountId,
          instanceName,
          error: queryError.message,
          code: queryError.code,
        });
        return NextResponse.json(
          { error: 'Erro ao buscar instância', requestId },
          { status: 500 }
        );
      }

      instance = data;
    } else {
      // Buscar primeira instância do usuário
      log('info', 'InstanceName não fornecido, buscando primeira instância do usuário', {
        requestId,
        accountId: user.accountId,
      });

      const { data, error: queryError } = await supabase
        .from('instances')
        .select('*')
        .eq('account_id', user.accountId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (queryError) {
        log('error', 'Erro ao buscar instância no Supabase', {
          requestId,
          accountId: user.accountId,
          error: queryError.message,
          code: queryError.code,
        });
        return NextResponse.json(
          { error: 'Erro ao buscar instância', requestId },
          { status: 500 }
        );
      }

      instance = data;
    }

    if (!instance) {
      log('warn', 'Instância não encontrada', {
        requestId,
        accountId: user.accountId,
        instanceName,
      });
      return NextResponse.json(
        { error: 'Instância não encontrada', requestId },
        { status: 404 }
      );
    }

    log('info', 'Instância encontrada, verificando status na Evolution API', {
      requestId,
      instanceId: instance.id,
      instanceName: instance.name,
      currentStatus: instance.status,
    });

    // Buscar status na Evolution API
    const evolutionStatus = await evolutionAPI.getInstanceStatus(instance.name);

    if (!evolutionStatus.success) {
      log('error', 'Erro ao verificar status na Evolution API', {
        requestId,
        instanceName,
        error: evolutionStatus.error,
      });
      // Retorna status do banco mesmo se Evolution API falhar
    }

    const evolutionState = evolutionStatus.data?.state || 'close';
    
    // Extrai QR Code do banco (se existir)
    let qrCode = instance.qr_code || instance.qr_code_base64 || null;

    // LÓGICA DE FALLBACK: Se instância está desconectada e não tem QR Code no banco,
    // busca diretamente da Evolution API e salva no banco
    const isDisconnected = evolutionState === 'close' || evolutionState === 'connecting' || !evolutionState;
    const needsQRCode = isDisconnected && !qrCode;

    // GRACE PERIOD: Verifica se a instância está em aquecimento antes de tentar buscar QR Code
    const instanceTimestamp = instance.updated_at || instance.created_at;
    const instanceDate = new Date(instanceTimestamp);
    const now = new Date();
    const secondsSinceUpdate = Math.floor((now.getTime() - instanceDate.getTime()) / 1000);
    const GRACE_PERIOD_SECONDS = 60; // Aumentado para 60 segundos
    const isInGracePeriod = secondsSinceUpdate < GRACE_PERIOD_SECONDS;

    if (needsQRCode) {
      // Durante o Grace Period, não tenta buscar QR Code via GET /connect
      // Confia que o webhook qrcode.update será disparado pela Evolution API
      if (isInGracePeriod) {
        log('info', `⏳ Instância em aquecimento (${secondsSinceUpdate}s). Aguardando webhook qrcode.update... Grace Period: ${GRACE_PERIOD_SECONDS}s`, {
          requestId,
          instanceName,
          secondsSinceUpdate,
          gracePeriodRemaining: GRACE_PERIOD_SECONDS - secondsSinceUpdate,
          hint: 'A Evolution API ainda está inicializando o navegador. O QR Code será enviado via webhook quando estiver pronto.',
        });
        
        // Retorna status atual sem QR Code - frontend continua polling
        // Não tenta buscar QR Code via GET /connect durante Grace Period
      } else {
        log('info', 'Instância desconectada sem QR Code no banco, buscando da Evolution API', {
          requestId,
          instanceName,
          evolutionState,
          secondsSinceUpdate,
          gracePeriodExceeded: true,
        });

        const connectResult = await evolutionAPI.connectInstance(instance.name);
        
        if (connectResult.success) {
          // Extrai QR Code da resposta
          const fetchedQRCode = connectResult.data?.base64 || connectResult.data?.code;
          
          if (fetchedQRCode) {
            log('info', 'QR Code obtido da Evolution API, salvando no banco', {
              requestId,
              instanceName,
              qrCodeLength: fetchedQRCode.length,
              qrCodePreview: fetchedQRCode.substring(0, 50) + '...',
            });

            // Salva QR Code no banco
            const updateData: any = {
              qr_code: fetchedQRCode,
              status: 'connecting',
              updated_at: new Date().toISOString(),
            };
            const { error: updateError } = await (supabase
              .from('instances') as any)
              .update(updateData)
              .eq('id', instance.id);

            if (updateError) {
              log('error', 'Erro ao salvar QR Code no banco', {
                requestId,
                instanceId: instance.id,
                error: updateError.message,
              });
            } else {
              // Atualiza qrCode para retornar na resposta
              qrCode = fetchedQRCode;
              log('info', 'QR Code salvo no banco com sucesso', {
                requestId,
                instanceName,
              });
            }
          } else {
            // Verifica se a resposta contém apenas 'count' (payload inválido)
            // IMPORTANTE: A resposta pode estar em result.data diretamente ou em result.data.data
            const rawData = connectResult.data as any;
            
            // Verifica múltiplas condições para detectar payload inválido
            const hasCountOnly = rawData && rawData.count !== undefined && Object.keys(rawData).length === 1;
            const hasCountZero = rawData && rawData.count === 0;
            const hasInvalidPayload = hasCountOnly || hasCountZero || (!rawData || Object.keys(rawData).length === 0);
            
            log('info', 'Verificando se payload é inválido', {
              requestId,
              instanceName,
              hasCountOnly,
              hasCountZero,
              hasInvalidPayload,
              rawDataKeys: rawData ? Object.keys(rawData) : [],
              rawDataStringified: JSON.stringify(rawData),
            });
            
            if (hasInvalidPayload) {
              // O endpoint GET /instance/connect não é confiável nesta versão da Evolution API
              // Ele retorna { count: 0 } mesmo quando a instância está funcionando
              // Devemos confiar exclusivamente no Webhook qrcode.update para obter o QR Code
              log('warn', 'Payload inválido recebido ({ count: 0 }). Ignorando e aguardando Webhook qrcode.update', {
                requestId,
                instanceName,
                count: rawData?.count,
                payload: JSON.stringify(rawData),
                reason: hasCountZero ? 'count === 0' : hasCountOnly ? 'apenas count' : 'payload vazio',
                secondsSinceUpdate,
                hint: 'O endpoint GET /instance/connect não é confiável. O QR Code será enviado via webhook qrcode.update quando a Evolution API terminar de inicializar o navegador. Mantendo instância viva.',
              });
              
              // NÃO executa Auto-Heal - mantém a instância viva
              // O webhook qrcode.update será disparado quando o QR Code estiver pronto
              // O frontend vai continuar tentando a cada 3s até receber o QR Code via polling do status
            }
          }
        } else {
          log('warn', 'Erro ao buscar QR Code da Evolution API', {
            requestId,
            instanceName,
            error: connectResult.error,
          });
        }
      }
    }

    const duration = Date.now() - startTime;
    log('info', 'Status da instância obtido com sucesso', {
      requestId,
      accountId: user.accountId,
      instanceId: instance.id,
      instanceName,
      status: instance.status,
      evolutionState,
      hasQRCode: !!qrCode,
      qrCodeSource: qrCode ? (needsQRCode ? 'fetched' : 'database') : 'none',
      duration: `${duration}ms`,
    });

    return NextResponse.json({
      status: instance.status,
      phoneNumber: instance.phone_number,
      profilePicUrl: instance.profile_pic_url,
      evolutionState,
      qrCode: qrCode || null, // Retorna QR Code do banco ou recém-buscado
      requestId,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log('error', 'Erro inesperado ao buscar status da instância', {
      requestId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`,
    });

    return NextResponse.json(
      { error: 'Erro interno do servidor', requestId },
      { status: 500 }
    );
  }
}

