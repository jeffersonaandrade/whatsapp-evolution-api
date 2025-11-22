import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { evolutionAPI } from '@/lib/evolution-api';
import { getAuthenticatedUser } from '@/lib/auth';
import { logger } from '@/lib/utils/logger';

/**
 * Processa criação/conexão de instância em background (Fire-and-Forget)
 * Esta função não bloqueia a resposta HTTP
 */
async function processInstanceCreationInBackground(
  instanceId: string,
  instanceName: string,
  accountId: string,
  isNewInstance: boolean,
  requestId: string
) {
  const supabase = createServerSupabase();
  const backgroundRequestId = `bg-${requestId}`;

  try {
    logger.info('[Instance/Connect] Background: Iniciando processamento', {
      backgroundRequestId,
      instanceId,
      instanceName,
      isNewInstance,
    });

    if (isNewInstance) {
      // Criar instância na Evolution API
      const createResult = await evolutionAPI.createInstance(instanceName);

      if (!createResult.success) {
        const isForbidden = 
          createResult.error?.includes('403') || 
          createResult.error?.includes('Forbidden') ||
          createResult.error?.includes('(403)');

        if (isForbidden) {
          // Instância já existe na Evolution API, tentar obter QR Code
          logger.warn('[Instance/Connect] Background: Instância já existe na Evolution API, obtendo QR Code', {
            backgroundRequestId,
            instanceName,
          });

          const connectResult = await evolutionAPI.connectInstance(instanceName);
          
          if (connectResult.success) {
            const qrCode = connectResult.data?.base64 || connectResult.data?.code;
            
            await (supabase.from('instances') as any)
              .update({
                status: 'connecting',
                qr_code: qrCode || null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', instanceId);

            logger.info('[Instance/Connect] Background: Instância recuperada e status atualizado', {
              backgroundRequestId,
              instanceId,
              instanceName,
              hasQRCode: !!qrCode,
            });
          } else {
            throw new Error(`Erro ao obter QR Code: ${connectResult.error}`);
          }
        } else {
          throw new Error(`Erro ao criar instância: ${createResult.error}`);
        }
      } else {
        // Instância criada com sucesso
        const qrCode = createResult.data?.base64 || createResult.data?.code;

        await (supabase.from('instances') as any)
          .update({
            status: 'connecting',
            qr_code: qrCode || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', instanceId);

        logger.info('[Instance/Connect] Background: Instância criada com sucesso', {
          backgroundRequestId,
          instanceId,
          instanceName,
          hasQRCode: !!qrCode,
        });
      }
    } else {
      // Conectar instância existente
      const connectResult = await evolutionAPI.connectInstance(instanceName);

      if (connectResult.success) {
        const qrCode = connectResult.data?.base64 || connectResult.data?.code;

        await (supabase.from('instances') as any)
          .update({
            status: 'connecting',
            qr_code: qrCode || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', instanceId);

        logger.info('[Instance/Connect] Background: Instância conectada com sucesso', {
          backgroundRequestId,
          instanceId,
          instanceName,
          hasQRCode: !!qrCode,
        });
      } else {
        throw new Error(`Erro ao conectar instância: ${connectResult.error}`);
      }
    }
  } catch (error) {
    logger.error('[Instance/Connect] Background: Erro ao processar instância', error, {
      backgroundRequestId,
      instanceId,
      instanceName,
      errorStep: 'background_processing',
    });

    // Atualizar status para 'error' no banco
    try {
      await (supabase.from('instances') as any)
        .update({
          status: 'disconnected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', instanceId);
    } catch (updateError) {
      logger.error('[Instance/Connect] Background: Erro ao atualizar status de erro no banco', updateError, {
        backgroundRequestId,
        instanceId,
      });
    }
  }
}

/**
 * Conectar instância WhatsApp
 * Usa padrão Fire-and-Forget para evitar timeout no Netlify (limite de 10s)
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  try {
    logger.info('[Instance/Connect] Iniciando conexão de instância WhatsApp', { requestId });

    // Verificar autenticação via cookies
    logger.debug('[Instance/Connect] Verificando autenticação', { requestId });
    const user = await getAuthenticatedUser(request);
    
    if (!user || !user.accountId) {
      logger.warn('[Instance/Connect] Tentativa de conexão sem autenticação', { requestId });
      return NextResponse.json(
        { error: 'Não autenticado', requestId },
        { status: 401 }
      );
    }

    logger.info('[Instance/Connect] Usuário autenticado', {
      requestId,
      userId: user.id,
      accountId: user.accountId,
      email: user.email,
    });

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      logger.error('[Instance/Connect] Erro ao fazer parse do body da requisição', parseError, {
        requestId,
        accountId: user.accountId,
        error: parseError instanceof Error ? parseError.message : 'Erro desconhecido',
      });
      return NextResponse.json(
        { error: 'Body da requisição inválido', requestId },
        { status: 400 }
      );
    }

    const { instanceName: providedInstanceName } = body;

    const supabase = createServerSupabase();

    // REGRA DE NEGÓCIO: Cada usuário tem APENAS UMA instância
    // SEMPRE buscar primeiro no Supabase para reutilizar a instância existente
    logger.info('[Instance/Connect] Buscando instância existente no Supabase', {
      requestId,
      accountId: user.accountId,
    });

    const { data: existingInstance, error: queryError } = await supabase
      .from('instances')
      .select('*')
      .eq('account_id', user.accountId)
      .maybeSingle();

    if (queryError) {
      logger.error('[Instance/Connect] Erro ao buscar instância no Supabase', queryError, {
        requestId,
        accountId: user.accountId,
        error: queryError.message,
        code: queryError.code,
        details: queryError.details,
      });
      return NextResponse.json(
        { error: 'Erro ao buscar instância existente', requestId },
        { status: 500 }
      );
    }

    // Se já existe instância no Supabase, SEMPRE reutilizar (mesmo instanceName)
    if (existingInstance) {
      // Type assertion necessário devido ao select do Supabase
      const instanceData = existingInstance as any;
      // Usar o instanceName existente (ignorar o fornecido no body, se houver)
      const instanceName = instanceData.name;
      
      logger.info('[Instance/Connect] Instância existente encontrada - REUTILIZANDO', {
        requestId,
        accountId: user.accountId,
        instanceId: instanceData.id,
        instanceName,
        currentStatus: instanceData.status,
        providedInstanceName: providedInstanceName || null,
      });

      // OTIMIZAÇÃO: Se já está conectada, retornar imediatamente sem chamar Evolution API
      if (instanceData.status === 'connected' && instanceData.phone_number) {
        const duration = Date.now() - startTime;
        logger.info('[Instance/Connect] Instância já conectada - retornando imediatamente', {
          requestId,
          accountId: user.accountId,
          instanceId: instanceData.id,
          instanceName,
          duration: `${duration}ms`,
        });

        return NextResponse.json({
          success: true,
          qrCode: null,
          instanceName,
          instanceId: instanceData.id,
          status: 'connected',
          phoneNumber: instanceData.phone_number,
          message: 'Instância já está conectada',
          requestId,
        });
      }

      // Verificar status na Evolution API
      logger.info('[Instance/Connect] Verificando status na Evolution API', {
        requestId,
        instanceName: instanceData.name,
      });

      const evolutionStatus = await evolutionAPI.getInstanceStatus(instanceData.name);

      // Se a instância não existe na Evolution API (404) criar uma nova
      if (!evolutionStatus.success) {
        const isNotFound = evolutionStatus.error?.includes('404') || 
                          evolutionStatus.error?.includes('Not Found') ||
                          evolutionStatus.error?.includes('not found');
        
        if (isNotFound) {
          logger.warn('[Instance/Connect] Instância existe no Supabase mas não na Evolution API, criando nova', {
            requestId,
            instanceName: instanceData.name,
            error: evolutionStatus.error,
          });

          // Deletar instância do Supabase para criar uma nova
          await supabase
            .from('instances')
            .delete()
            .eq('id', instanceData.id);

          logger.info('[Instance/Connect] Instância removida do Supabase, será criada nova', {
            requestId,
            instanceName: instanceData.name,
          });

          // Continuar o fluxo para criar nova instância (cai no bloco "Se não existe")
        } else {
          logger.error('[Instance/Connect] Erro ao verificar status na Evolution API', {
            requestId,
            instanceName: instanceData.name,
            error: evolutionStatus.error,
          });
          return NextResponse.json(
            { error: 'Erro ao verificar status da instância', details: evolutionStatus.error, requestId },
            { status: 500 }
          );
        }
      } else {
        const evolutionState = evolutionStatus.data?.state || 'unknown';
        logger.info('[Instance/Connect] Status da Evolution API obtido', {
          requestId,
          instanceName: instanceData.name,
          evolutionState,
        });

        // Se a instância está desconectada, processar reconexão em background
        if (evolutionState === 'close' || !evolutionState) {
          logger.info('[Instance/Connect] Instância desconectada, iniciando reconexão em background', {
            requestId,
            instanceName: instanceData.name,
          });

          // Atualizar status para 'connecting' no banco imediatamente
          await (supabase.from('instances') as any)
            .update({
              status: 'connecting',
              updated_at: new Date().toISOString(),
            })
            .eq('id', instanceData.id);

          // Processar reconexão em background (Fire-and-Forget)
          processInstanceCreationInBackground(
            instanceData.id,
            instanceData.name,
            user.accountId,
            false, // isNewInstance = false
            requestId
          ).catch((error) => {
            logger.error('[Instance/Connect] Erro ao iniciar processamento em background', error, {
              requestId,
              instanceId: instanceData.id,
            });
          });

          // Retornar 202 Accepted imediatamente (antes de 10s do Netlify)
          const duration = Date.now() - startTime;
          logger.info('[Instance/Connect] Processo de reconexão iniciado em background', {
            requestId,
            accountId: user.accountId,
            instanceId: instanceData.id,
            instanceName: instanceData.name,
            duration: `${duration}ms`,
          });

          return NextResponse.json(
            {
              success: true,
              status: 'initializing',
              instanceName: instanceData.name,
              instanceId: instanceData.id,
              message: 'Processo de reconexão iniciado em background. O QR Code será enviado via webhook em alguns segundos.',
              requestId,
            },
            { status: 202 }
          );
        }

        // Se já está conectada, retorna sucesso sem QR Code
        const duration = Date.now() - startTime;
        logger.info('[Instance/Connect] Instância já está conectada', {
          requestId,
          accountId: user.accountId,
          instanceId: instanceData.id,
          instanceName: instanceData.name,
          status: instanceData.status,
          duration: `${duration}ms`,
        });

        return NextResponse.json({
          success: true,
          qrCode: null,
          instanceName: instanceData.name,
          instanceId: instanceData.id,
          status: instanceData.status,
          phoneNumber: instanceData.phone_number,
          message: 'Instância já está conectada',
          requestId,
        });
      }
    }

    // Se não existe no Supabase, criar nova instância (Fire-and-Forget)
    // Gerar instanceName automaticamente se não foi fornecido
    // Formato: instance-{account_id} (sem hífens)
    const instanceName = providedInstanceName || `instance-${user.accountId.replace(/-/g, '')}`;
    
    logger.info('[Instance/Connect] Nenhuma instância encontrada no Supabase, criando nova em background', {
      requestId,
      accountId: user.accountId,
      instanceName,
      provided: !!providedInstanceName,
    });

    // Salvar instância no Supabase com status 'initializing' IMEDIATAMENTE
    const { data: instance, error: dbError } = await supabase
      .from('instances')
      .insert({
        account_id: user.accountId,
        name: instanceName,
        status: 'initializing',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)
      .select()
      .single();

    if (dbError || !instance) {
      logger.error('[Instance/Connect] Erro ao salvar instância no Supabase', {
        requestId,
        accountId: user.accountId,
        instanceName,
        error: dbError?.message || 'Instância não retornada',
        code: dbError?.code,
        details: dbError?.details,
      });

      return NextResponse.json(
        { error: 'Erro ao salvar instância no banco de dados', requestId },
        { status: 500 }
      );
    }

    // Type assertion necessário devido ao insert do Supabase
    const instanceData = instance as any;

    logger.info('[Instance/Connect] Instância salva no Supabase, iniciando criação em background', {
      requestId,
      accountId: user.accountId,
      instanceId: instanceData.id,
      instanceName,
    });

    // Processar criação em background (Fire-and-Forget) - NÃO USA AWAIT
    processInstanceCreationInBackground(
      instanceData.id,
      instanceName,
      user.accountId,
      true, // isNewInstance = true
      requestId
    ).catch((error) => {
      logger.error('[Instance/Connect] Erro ao iniciar processamento em background', error, {
        requestId,
        instanceId: instanceData.id,
      });
    });

    // Retornar 202 Accepted IMEDIATAMENTE (antes de 10s do Netlify)
    const duration = Date.now() - startTime;
    logger.info('[Instance/Connect] Processo de criação iniciado em background', {
      requestId,
      accountId: user.accountId,
      instanceId: instanceData.id,
      instanceName,
      duration: `${duration}ms`,
    });

    return NextResponse.json(
      {
        success: true,
        status: 'initializing',
        instanceName,
        instanceId: instanceData.id,
        message: 'Processo de criação iniciado em background. O QR Code será enviado via webhook em alguns segundos.',
        requestId,
      },
      { status: 202 }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('[Instance/Connect] Erro inesperado ao conectar instância', error, {
      requestId,
      duration: `${duration}ms`,
      errorStep: 'unexpected_error',
    });

    return NextResponse.json(
      { error: 'Erro interno do servidor', requestId },
      { status: 500 }
    );
  }
}

