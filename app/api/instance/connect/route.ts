import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { evolutionAPI } from '@/lib/evolution-api';
import { getAuthenticatedUser } from '@/lib/auth';
import { logger } from '@/lib/utils/logger';

/**
 * Conectar instância WhatsApp
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  try {
    logger.info('[Instance/Connect] Iniciando conexão de instância WhatsApp', { requestId });

    // Debug: Log headers relevantes
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const cookieHeader = request.headers.get('cookie');
    logger.debug('[Instance/Connect] Headers da requisição', {
      requestId,
      origin,
      referer,
      hasCookieHeader: !!cookieHeader,
      cookieHeaderLength: cookieHeader?.length || 0,
      cookieHeaderPreview: cookieHeader ? cookieHeader.substring(0, 200) : null,
      allCookiesCount: request.cookies.getAll().length,
      allCookieNames: request.cookies.getAll().map(c => c.name),
    });

    // Verificar autenticação via cookies
    logger.debug('[Instance/Connect] Verificando autenticação', { requestId });
    const user = await getAuthenticatedUser(request);
    
    if (!user || !user.accountId) {
      logger.warn('[Instance/Connect] Tentativa de conexão sem autenticação', { 
        requestId,
        hasUser: !!user,
        hasAccountId: user ? !!user.accountId : false,
        origin,
        referer,
      });
      return NextResponse.json(
        { error: 'Não autenticado', requestId, details: 'Cookie de autenticação não encontrado ou inválido' },
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

        // Se a instância está desconectada, obter novo QR Code
        if (evolutionState === 'close' || !evolutionState) {
          logger.info('[Instance/Connect] Instância desconectada, obtendo novo QR Code', {
            requestId,
            instanceName: instanceData.name,
          });

          const connectResult = await evolutionAPI.connectInstance(instanceData.name);

          if (!connectResult.success) {
            // Se não conseguiu obter QR Code, pode ser que a instância não existe
            const isNotFound = connectResult.error?.includes('404') || 
                              connectResult.error?.includes('Not Found') ||
                              connectResult.error?.includes('not found');
            
            if (isNotFound) {
              logger.warn('[Instance/Connect] Instância não existe na Evolution API, criando nova', {
                requestId,
                instanceName: instanceData.name,
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
              logger.error('[Instance/Connect] Erro ao obter QR Code da instância desconectada', {
                requestId,
                instanceName: instanceData.name,
                error: connectResult.error,
              });
              return NextResponse.json(
                { error: 'Erro ao obter QR Code', details: connectResult.error, requestId },
                { status: 500 }
              );
            }
          } else {
            // QR Code obtido com sucesso
            const qrCode = connectResult.data?.base64 || connectResult.data?.code;
            
            if (!qrCode) {
              logger.warn('[Instance/Connect] QR Code não retornado pela Evolution API - pode estar sendo enviado via webhook', {
                requestId,
                instanceName: instanceData.name,
                hint: 'O QR Code pode ser enviado via webhook qrcode.update. Verifique o webhook.',
              });
              
              // Se não retornou QR Code, retorna mensagem informativa
              return NextResponse.json({
                success: true,
                qrCode: null,
                instanceName: instanceData.name,
                instanceId: instanceData.id,
                status: 'connecting',
                message: 'Aguardando QR Code. O código será enviado via webhook em alguns segundos.',
                requestId,
              });
            }

            // Atualizar status no banco para 'connecting'
            const updateData: any = {
              status: 'connecting',
              updated_at: new Date().toISOString()
            };
            const { error: updateError } = await (supabase
              .from('instances') as any)
              .update(updateData)
              .eq('id', instanceData.id);

            if (updateError) {
              logger.error('[Instance/Connect] Erro ao atualizar status da instância no Supabase', {
                requestId,
                instanceId: instanceData.id,
                error: updateError.message,
              });
              // Não retorna erro, apenas loga, pois o QR Code já foi obtido
            }

            const duration = Date.now() - startTime;
            logger.info('[Instance/Connect] QR Code obtido com sucesso (instância existente)', {
              requestId,
              accountId: user.accountId,
              instanceId: instanceData.id,
              instanceName: instanceData.name,
              hasQRCode: !!qrCode,
              duration: `${duration}ms`,
            });

            return NextResponse.json({
              success: true,
              qrCode: qrCode || null,
              instanceName: instanceData.name,
              instanceId: instanceData.id,
              status: 'connecting',
              message: qrCode ? 'Escaneie o QR Code com o WhatsApp para reconectar' : 'Instância encontrada mas QR Code não disponível. Tente novamente em alguns segundos.',
              requestId,
            });
          }
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

    // Se não existe no Supabase, criar nova instância
    // Gerar instanceName automaticamente se não foi fornecido
    // Formato: instance-{account_id} (sem hífens)
    const instanceName = providedInstanceName || `instance-${user.accountId.replace(/-/g, '')}`;
    
    logger.info('[Instance/Connect] Nenhuma instância encontrada no Supabase, criando nova', {
      requestId,
      accountId: user.accountId,
      instanceName,
      provided: !!providedInstanceName,
    });

    const createResult = await evolutionAPI.createInstance(instanceName);

    if (!createResult.success) {
      // Se der erro 403 (Forbidden) a instância já existe na Evolution API
      // Mas não existe no Supabase - isso pode acontecer se o banco foi limpo
      const isForbidden = 
        createResult.error?.includes('403') || 
        createResult.error?.includes('Forbidden') ||
        createResult.error?.includes('(403)');
      
      if (isForbidden) {
        logger.warn('[Instance/Connect] Erro 403 - instância já existe na Evolution API mas não no Supabase, tentando obter QR Code', {
          requestId,
          accountId: user.accountId,
          instanceName,
          error: createResult.error,
        });

        // Tenta obter QR Code da instância existente na Evolution API
        const connectResult = await evolutionAPI.connectInstance(instanceName);
        
        if (connectResult.success) {
          // Instância existe na Evolution API, salvar no Supabase (INSERT - primeira vez)
          logger.info('[Instance/Connect] Instância existe na Evolution API, salvando no Supabase', {
            requestId,
            accountId: user.accountId,
            instanceName,
          });

          const { data: instance, error: dbError } = await supabase
            .from('instances')
            .insert({
              account_id: user.accountId,
              name: instanceName,
              status: 'connecting',
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
            });
            return NextResponse.json(
              { error: 'Erro ao salvar instância no banco de dados', requestId },
              { status: 500 }
            );
          }

          // Type assertion necessário devido ao insert do Supabase
          const instanceData = instance as any;

          const qrCode = connectResult.data?.base64 || connectResult.data?.code;
          const duration = Date.now() - startTime;
          
          logger.info('[Instance/Connect] Instância recuperada da Evolution API e salva no Supabase', {
            requestId,
            accountId: user.accountId,
            instanceId: instanceData.id,
            instanceName,
            hasQRCode: !!qrCode,
            duration: `${duration}ms`,
          });

          return NextResponse.json({
            success: true,
            qrCode: qrCode || null,
            instanceName,
            instanceId: instanceData.id,
            message: qrCode ? 'Escaneie o QR Code com o WhatsApp' : 'Instância encontrada mas QR Code não disponível. Tente novamente em alguns segundos.',
            requestId,
          });
        } else {
          logger.error('[Instance/Connect] Erro ao obter QR Code da instância existente na Evolution API', {
            requestId,
            accountId: user.accountId,
            instanceName,
            error: connectResult.error,
          });
          return NextResponse.json(
            { error: 'Erro ao obter QR Code da instância', details: connectResult.error, requestId },
            { status: 500 }
          );
        }
      } else {
        logger.error('[Instance/Connect] Erro ao criar instância na Evolution API', {
          requestId,
          accountId: user.accountId,
          instanceName,
          error: createResult.error,
        });
        return NextResponse.json(
          { error: 'Erro ao criar instância', details: createResult.error, requestId },
          { status: 500 }
        );
      }
    }

    logger.info('[Instance/Connect] Instância criada na Evolution API', {
      requestId,
      accountId: user.accountId,
      instanceName,
      hasQRCode: !!(createResult.data?.base64 || createResult.data?.code)
    });

    // Salvar instância no Supabase
    logger.info('[Instance/Connect] Salvando instância no Supabase', {
      requestId,
      accountId: user.accountId,
      instanceName,
    });

    const { data: instance, error: dbError } = await supabase
      .from('instances')
      .insert({
        account_id: user.accountId,
        name: instanceName,
        status: 'connecting',
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

      // Tenta deletar a instância na Evolution API
      logger.info('[Instance/Connect] Tentando deletar instância na Evolution API após erro no Supabase', {
        requestId,
        instanceName,
      });

      const deleteResult = await evolutionAPI.deleteInstance(instanceName);
      if (!deleteResult.success) {
        logger.error('[Instance/Connect] Erro ao deletar instância na Evolution API após falha no Supabase', {
          requestId,
          instanceName,
          error: deleteResult.error,
        });
      }

      return NextResponse.json(
        { error: 'Erro ao salvar instância no banco de dados', requestId },
        { status: 500 }
      );
    }

    // Type assertion necessário devido ao insert do Supabase
    const instanceData = instance as any;

    logger.info('[Instance/Connect] Instância salva no Supabase', {
      requestId,
      accountId: user.accountId,
      instanceId: instanceData.id,
      instanceName,
    });

    // Obter QR Code (pode não vir na criação, então obtemos separadamente)
    let qrCode = createResult.data?.base64 || createResult.data?.code;
    
    // Se não veio QR Code na criação, tenta obter via connect
    if (!qrCode) {
      logger.info('[Instance/Connect] QR Code não veio na criação, tentando obter via connect', {
        requestId,
        instanceName,
      });

      const connectResult = await evolutionAPI.connectInstance(instanceName);
      if (connectResult.success) {
        qrCode = connectResult.data?.base64 || connectResult.data?.code;
        logger.info('[Instance/Connect] QR Code obtido via connect', {
          requestId,
          instanceName,
          hasQRCode: !!qrCode,
        });
      } else {
        logger.warn('[Instance/Connect] Não foi possível obter QR Code via connect', {
          requestId,
          instanceName,
          error: connectResult.error,
        });
      }
    }

    const duration = Date.now() - startTime;
    logger.info('[Instance/Connect] Conexão de instância concluída com sucesso', {
      requestId,
      accountId: user.accountId,
      instanceId: instanceData.id,
      instanceName,
      hasQRCode: !!qrCode,
      duration: `${duration}ms`,
    });

    return NextResponse.json({
      success: true,
      qrCode: qrCode || null,
      instanceName,
      instanceId: instanceData.id,
      message: qrCode ? 'Escaneie o QR Code com o WhatsApp' : 'Instância criada. Use o endpoint de QR Code para obter o código.',
      requestId,
    });
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

