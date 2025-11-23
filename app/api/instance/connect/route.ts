import { NextRequest, NextResponse } from 'next/server';
import { evolutionAPI } from '@/lib/evolution-api';
import { getAuthenticatedUser } from '@/lib/auth';
import { logger } from '@/lib/utils/logger';
import { supabaseService } from '@/lib/services/supabase-service';

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
            
            await supabaseService.updateInstance(instanceId, {
              status: 'connecting',
              qr_code: qrCode || undefined,
            });

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

        await supabaseService.updateInstance(instanceId, {
          status: 'connecting',
          qr_code: qrCode || undefined,
        });

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

        await supabaseService.updateInstance(instanceId, {
          status: 'connecting',
          qr_code: qrCode || undefined,
        });

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
      await supabaseService.updateInstance(instanceId, {
        status: 'disconnected',
      });
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

    // REGRA DE NEGÓCIO: Cada usuário tem APENAS UMA instância
    // SEMPRE buscar primeiro no Supabase para reutilizar a instância existente
    logger.info('[Instance/Connect] Buscando instância existente no Supabase', {
      requestId,
      accountId: user.accountId,
    });

    const existingInstance = await supabaseService.getInstanceByAccountId(user.accountId);

    // Se já existe instância no Supabase, SEMPRE reutilizar (mesmo instanceName)
    if (existingInstance) {
      // Usar o instanceName existente (ignorar o fornecido no body, se houver)
      const instanceName = existingInstance.name;
      
      logger.info('[Instance/Connect] Instância existente encontrada - REUTILIZANDO', {
        requestId,
        accountId: user.accountId,
        instanceId: existingInstance.id,
        instanceName,
        currentStatus: existingInstance.status,
        providedInstanceName: providedInstanceName || null,
      });

      // OTIMIZAÇÃO: Se já está conectada, retornar imediatamente sem chamar Evolution API
      if (existingInstance.status === 'connected' && existingInstance.phone_number) {
        const duration = Date.now() - startTime;
        logger.info('[Instance/Connect] Instância já conectada - retornando imediatamente', {
          requestId,
          accountId: user.accountId,
          instanceId: existingInstance.id,
          instanceName,
          duration: `${duration}ms`,
        });

        return NextResponse.json({
          success: true,
          qrCode: null,
          instanceName,
          instanceId: existingInstance.id,
          status: 'connected',
          phoneNumber: existingInstance.phone_number,
          message: 'Instância já está conectada',
          requestId,
        });
      }

      // Verificar status na Evolution API
      logger.info('[Instance/Connect] Verificando status na Evolution API', {
        requestId,
        instanceName: existingInstance.name,
      });

      const evolutionStatus = await evolutionAPI.getInstanceStatus(existingInstance.name);

      // Se a instância não existe na Evolution API (404) criar uma nova
      if (!evolutionStatus.success) {
        const isNotFound = evolutionStatus.error?.includes('404') || 
                          evolutionStatus.error?.includes('Not Found') ||
                          evolutionStatus.error?.includes('not found');
        
        if (isNotFound) {
          logger.warn('[Instance/Connect] Instância existe no Supabase mas não na Evolution API, criando nova', {
            requestId,
            instanceName: existingInstance.name,
            error: evolutionStatus.error,
          });

          // Remover registro local para recriar
          // (opcionalmente poderíamos apenas atualizar o name)
          logger.info('[Instance/Connect] Registrando recriação de instância', {
            requestId,
            instanceName: existingInstance.name,
          });

          // Continuar o fluxo para criar nova instância (cai no bloco "Se não existe")
        } else {
          logger.error('[Instance/Connect] Erro ao verificar status na Evolution API', {
            requestId,
            instanceName: existingInstance.name,
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
          instanceName: existingInstance.name,
          evolutionState,
        });

        // Se a instância está desconectada, processar reconexão em background
        if (evolutionState === 'close' || !evolutionState) {
          logger.info('[Instance/Connect] Instância desconectada, iniciando reconexão em background', {
            requestId,
            instanceName: existingInstance.name,
          });

          // Atualizar status para 'connecting' no banco imediatamente
          await supabaseService.updateInstance(existingInstance.id, {
            status: 'connecting',
          });

          // Processar reconexão em background (Fire-and-Forget)
          processInstanceCreationInBackground(
            existingInstance.id,
            existingInstance.name,
            user.accountId,
            false, // isNewInstance = false
            requestId
          ).catch((error) => {
            logger.error('[Instance/Connect] Erro ao iniciar processamento em background', error, {
              requestId,
              instanceId: existingInstance.id,
            });
          });

          // Retornar 202 Accepted imediatamente (antes de 10s do Netlify)
          const duration = Date.now() - startTime;
          logger.info('[Instance/Connect] Processo de reconexão iniciado em background', {
            requestId,
            accountId: user.accountId,
            instanceId: existingInstance.id,
            instanceName: existingInstance.name,
            duration: `${duration}ms`,
          });

          return NextResponse.json(
            {
              success: true,
              status: 'initializing',
              instanceName: existingInstance.name,
              instanceId: existingInstance.id,
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
          instanceId: existingInstance.id,
          instanceName: existingInstance.name,
          status: existingInstance.status,
          duration: `${duration}ms`,
        });

        return NextResponse.json({
          success: true,
          qrCode: null,
          instanceName: existingInstance.name,
          instanceId: existingInstance.id,
          status: existingInstance.status,
          phoneNumber: existingInstance.phone_number,
          message: 'Instância já está conectada',
          requestId,
        });
      }
    }

    // Se não existe no Supabase, criar nova instância (Fire-and-Forget)
    // Gerar instanceName automaticamente se não foi fornecido
    // Formato: instance-{account_id} (sem hífens)
    const instanceName = providedInstanceName || `instance-${user.accountId.replace(/-/g, '')}`;
    
    logger.info('[Instance/Connect] Nenhuma instância encontrada, criando nova em background', {
      requestId,
      accountId: user.accountId,
      instanceName,
      provided: !!providedInstanceName,
    });

    // Salvar instância no SQLite com status 'connecting' IMEDIATAMENTE
    const newInstance = await supabaseService.createInstance({
      account_id: user.accountId,
      name: instanceName,
      status: 'connecting',
    });

    logger.info('[Instance/Connect] Instância salva, iniciando criação em background', {
      requestId,
      accountId: user.accountId,
      instanceId: newInstance.id,
      instanceName,
    });

    // Processar criação em background (Fire-and-Forget) - NÃO USA AWAIT
    processInstanceCreationInBackground(
      newInstance.id,
      instanceName,
      user.accountId,
      true, // isNewInstance = true
      requestId
    ).catch((error) => {
      logger.error('[Instance/Connect] Erro ao iniciar processamento em background', error, {
        requestId,
        instanceId: newInstance.id,
      });
    });

    // Retornar 202 Accepted IMEDIATAMENTE (antes de 10s do Netlify)
    const duration = Date.now() - startTime;
    logger.info('[Instance/Connect] Processo de criação iniciado em background', {
      requestId,
      accountId: user.accountId,
      instanceId: newInstance.id,
      instanceName,
      duration: `${duration}ms`,
    });

    return NextResponse.json(
      {
        success: true,
        status: 'initializing',
        instanceName,
        instanceId: newInstance.id,
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

