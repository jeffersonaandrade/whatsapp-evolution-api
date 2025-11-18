import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { evolutionAPI } from '@/lib/evolution-api';
import { getAuthenticatedUser } from '@/lib/auth';

/**
 * Utilitário para logs estruturados
 */
function log(level: 'info' | 'warn' | 'error', message: string, context?: Record<string, any>) {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    level,
    message,
    ...context,
  };
  
  if (level === 'error') {
    console.error(`[${timestamp}] [ERROR] ${message}`, context || '');
  } else if (level === 'warn') {
    console.warn(`[${timestamp}] [WARN] ${message}`, context || '');
  } else {
    console.log(`[${timestamp}] [INFO] ${message}`, context || '');
  }
}

/**
 * Conectar instância WhatsApp
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  try {
    log('info', 'Iniciando conexão de instância WhatsApp', { requestId });

    // Verificar autenticação via cookies
    const user = await getAuthenticatedUser(request);
    
    if (!user || !user.accountId) {
      log('warn', 'Tentativa de conexão sem autenticação', { requestId });
      return NextResponse.json(
        { error: 'Não autenticado', requestId },
        { status: 401 }
      );
    }

    log('info', 'Usuário autenticado', {
      requestId,
      userId: user.id,
      accountId: user.accountId,
      email: user.email,
    });

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      log('error', 'Erro ao fazer parse do body da requisição', {
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
    log('info', 'Buscando instância existente no Supabase', {
      requestId,
      accountId: user.accountId,
    });

    const { data: existingInstance, error: queryError } = await supabase
      .from('instances')
      .select('*')
      .eq('account_id', user.accountId)
      .maybeSingle();

    if (queryError) {
      log('error', 'Erro ao buscar instância no Supabase', {
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
      // Usar o instanceName existente (ignorar o fornecido no body, se houver)
      const instanceName = existingInstance.name;
      
      log('info', 'Instância existente encontrada - REUTILIZANDO', {
        requestId,
        accountId: user.accountId,
        instanceId: existingInstance.id,
        instanceName,
        currentStatus: existingInstance.status,
        providedInstanceName: providedInstanceName || null,
      });

      // Verificar status na Evolution API
      log('info', 'Verificando status na Evolution API', {
        requestId,
        instanceName: existingInstance.name,
      });

      const evolutionStatus = await evolutionAPI.getInstanceStatus(existingInstance.name);

      // Se a instância não existe na Evolution API (404), criar uma nova
      if (!evolutionStatus.success) {
        const isNotFound = evolutionStatus.error?.includes('404') || 
                          evolutionStatus.error?.includes('Not Found') ||
                          evolutionStatus.error?.includes('not found');
        
        if (isNotFound) {
          log('warn', 'Instância existe no Supabase mas não na Evolution API, criando nova', {
            requestId,
            instanceName: existingInstance.name,
            error: evolutionStatus.error,
          });

          // Deletar instância do Supabase para criar uma nova
          await supabase
            .from('instances')
            .delete()
            .eq('id', existingInstance.id);

          log('info', 'Instância removida do Supabase, será criada nova', {
            requestId,
            instanceName: existingInstance.name,
          });

          // Continuar o fluxo para criar nova instância (cai no bloco "Se não existe")
        } else {
          log('error', 'Erro ao verificar status na Evolution API', {
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
        log('info', 'Status da Evolution API obtido', {
          requestId,
          instanceName: existingInstance.name,
          evolutionState,
        });

        // Se a instância está desconectada, obter novo QR Code
        if (evolutionState === 'close' || !evolutionState) {
          log('info', 'Instância desconectada, obtendo novo QR Code', {
            requestId,
            instanceName: existingInstance.name,
          });

          const connectResult = await evolutionAPI.connectInstance(existingInstance.name);

          if (!connectResult.success) {
            // Se não conseguiu obter QR Code, pode ser que a instância não existe
            const isNotFound = connectResult.error?.includes('404') || 
                              connectResult.error?.includes('Not Found') ||
                              connectResult.error?.includes('not found');
            
            if (isNotFound) {
              log('warn', 'Instância não existe na Evolution API, criando nova', {
                requestId,
                instanceName: existingInstance.name,
              });

              // Deletar instância do Supabase para criar uma nova
              await supabase
                .from('instances')
                .delete()
                .eq('id', existingInstance.id);

              log('info', 'Instância removida do Supabase, será criada nova', {
                requestId,
                instanceName: existingInstance.name,
              });

              // Continuar o fluxo para criar nova instância (cai no bloco "Se não existe")
            } else {
              log('error', 'Erro ao obter QR Code da instância desconectada', {
                requestId,
                instanceName: existingInstance.name,
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
              log('warn', 'QR Code não retornado pela Evolution API - pode estar sendo enviado via webhook', {
                requestId,
                instanceName: existingInstance.name,
                hint: 'O QR Code pode ser enviado via webhook qrcode.update. Verifique o webhook.',
              });
              
              // Se não retornou QR Code, retorna mensagem informativa
              return NextResponse.json({
                success: true,
                qrCode: null,
                instanceName: existingInstance.name,
                instanceId: existingInstance.id,
                status: 'connecting',
                message: 'Aguardando QR Code. O código será enviado via webhook em alguns segundos.',
                requestId,
              });
            }

            // Atualizar status no banco para 'connecting'
            const { error: updateError } = await supabase
              .from('instances')
              .update({
                status: 'connecting',
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingInstance.id);

            if (updateError) {
              log('error', 'Erro ao atualizar status da instância no Supabase', {
                requestId,
                instanceId: existingInstance.id,
                error: updateError.message,
              });
              // Não retorna erro, apenas loga, pois o QR Code já foi obtido
            }

            const duration = Date.now() - startTime;
            log('info', 'QR Code obtido com sucesso (instância existente)', {
              requestId,
              accountId: user.accountId,
              instanceId: existingInstance.id,
              instanceName: existingInstance.name,
              hasQRCode: !!qrCode,
              duration: `${duration}ms`,
            });

            return NextResponse.json({
              success: true,
              qrCode: qrCode || null,
              instanceName: existingInstance.name,
              instanceId: existingInstance.id,
              status: 'connecting',
              message: qrCode ? 'Escaneie o QR Code com o WhatsApp para reconectar' : 'Instância encontrada mas QR Code não disponível. Tente novamente em alguns segundos.',
              requestId,
            });
          }
        }

        // Se já está conectada, retorna sucesso sem QR Code
        const duration = Date.now() - startTime;
        log('info', 'Instância já está conectada', {
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

    // Se não existe no Supabase, criar nova instância
    // Gerar instanceName automaticamente se não foi fornecido
    // Formato: instance-{account_id} (sem hífens)
    const instanceName = providedInstanceName || `instance-${user.accountId.replace(/-/g, '')}`;
    
    log('info', 'Nenhuma instância encontrada no Supabase, criando nova', {
      requestId,
      accountId: user.accountId,
      instanceName,
      provided: !!providedInstanceName,
    });

    const createResult = await evolutionAPI.createInstance(instanceName);

    if (!createResult.success) {
      // Se der erro 403 (Forbidden), a instância já existe na Evolution API
      // Mas não existe no Supabase - isso pode acontecer se o banco foi limpo
      const isForbidden = 
        createResult.error?.includes('403') || 
        createResult.error?.includes('Forbidden') ||
        createResult.error?.includes('(403)');
      
      if (isForbidden) {
        log('warn', 'Erro 403 - instância já existe na Evolution API mas não no Supabase, tentando obter QR Code', {
          requestId,
          accountId: user.accountId,
          instanceName,
          error: createResult.error,
        });

        // Tenta obter QR Code da instância existente na Evolution API
        const connectResult = await evolutionAPI.connectInstance(instanceName);
        
        if (connectResult.success) {
          // Instância existe na Evolution API, salvar no Supabase (INSERT - primeira vez)
          log('info', 'Instância existe na Evolution API, salvando no Supabase', {
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
            })
            .select()
            .single();

          if (dbError || !instance) {
            log('error', 'Erro ao salvar instância no Supabase', {
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

          const qrCode = connectResult.data?.base64 || connectResult.data?.code;
          const duration = Date.now() - startTime;
          
          log('info', 'Instância recuperada da Evolution API e salva no Supabase', {
            requestId,
            accountId: user.accountId,
            instanceId: instance.id,
            instanceName,
            hasQRCode: !!qrCode,
            duration: `${duration}ms`,
          });

          return NextResponse.json({
            success: true,
            qrCode: qrCode || null,
            instanceName,
            instanceId: instance.id,
            message: qrCode ? 'Escaneie o QR Code com o WhatsApp' : 'Instância encontrada mas QR Code não disponível. Tente novamente em alguns segundos.',
            requestId,
          });
        } else {
          log('error', 'Erro ao obter QR Code da instância existente na Evolution API', {
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
        log('error', 'Erro ao criar instância na Evolution API', {
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

    log('info', 'Instância criada na Evolution API', {
      requestId,
      accountId: user.accountId,
      instanceName,
      hasQRCode: !!(createResult.data?.base64 || createResult.data?.code),
    });

    // Salvar instância no Supabase
    log('info', 'Salvando instância no Supabase', {
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
      })
      .select()
      .single();

    if (dbError || !instance) {
      log('error', 'Erro ao salvar instância no Supabase', {
        requestId,
        accountId: user.accountId,
        instanceName,
        error: dbError?.message || 'Instância não retornada',
        code: dbError?.code,
        details: dbError?.details,
      });

      // Tenta deletar a instância na Evolution API
      log('info', 'Tentando deletar instância na Evolution API após erro no Supabase', {
        requestId,
        instanceName,
      });

      const deleteResult = await evolutionAPI.deleteInstance(instanceName);
      if (!deleteResult.success) {
        log('error', 'Erro ao deletar instância na Evolution API após falha no Supabase', {
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

    log('info', 'Instância salva no Supabase', {
      requestId,
      accountId: user.accountId,
      instanceId: instance.id,
      instanceName,
    });

    // Obter QR Code (pode não vir na criação, então obtemos separadamente)
    let qrCode = createResult.data?.base64 || createResult.data?.code;
    
    // Se não veio QR Code na criação, tenta obter via connect
    if (!qrCode) {
      log('info', 'QR Code não veio na criação, tentando obter via connect', {
        requestId,
        instanceName,
      });

      const connectResult = await evolutionAPI.connectInstance(instanceName);
      if (connectResult.success) {
        qrCode = connectResult.data?.base64 || connectResult.data?.code;
        log('info', 'QR Code obtido via connect', {
          requestId,
          instanceName,
          hasQRCode: !!qrCode,
        });
      } else {
        log('warn', 'Não foi possível obter QR Code via connect', {
          requestId,
          instanceName,
          error: connectResult.error,
        });
      }
    }

    const duration = Date.now() - startTime;
    log('info', 'Conexão de instância concluída com sucesso', {
      requestId,
      accountId: user.accountId,
      instanceId: instance.id,
      instanceName,
      hasQRCode: !!qrCode,
      duration: `${duration}ms`,
    });

    return NextResponse.json({
      success: true,
      qrCode: qrCode || null,
      instanceName,
      instanceId: instance.id,
      message: qrCode ? 'Escaneie o QR Code com o WhatsApp' : 'Instância criada. Use o endpoint de QR Code para obter o código.',
      requestId,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log('error', 'Erro inesperado ao conectar instância', {
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

