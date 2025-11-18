import { NextRequest, NextResponse } from 'next/server';
import { evolutionAPI } from '@/lib/evolution-api';
import { supabaseService } from '@/lib/services/supabase-service';

/**
 * Rota de TESTE - Conectar instância WhatsApp (SEM autenticação)
 * ⚠️ REMOVER EM PRODUÇÃO
 */
export async function POST(request: NextRequest) {
  try {
    const { instanceName: providedInstanceName, accountId } = await request.json();

    // Determinar accountId
    const targetAccountId =
      typeof accountId === 'string' && accountId.length > 0
        ? accountId
        : process.env.TEST_ACCOUNT_ID || '00000000-0000-0000-0000-000000000001';

    // Gerar instanceName automaticamente se não foi fornecido
    // Formato: instance-{account_id} (sem hífens)
    const instanceName = providedInstanceName || `instance-${targetAccountId.replace(/-/g, '')}`;

    // DEBUG: Verificar se a API Key está sendo lida
    const apiKey = process.env.EVOLUTION_API_KEY;
    console.log('[DEBUG] EVOLUTION_API_KEY (tamanho):', apiKey?.length || 0);
    console.log('[DEBUG] EVOLUTION_API_URL:', process.env.NEXT_PUBLIC_EVOLUTION_API_URL);
    console.log('[DEBUG] AccountId:', targetAccountId);
    console.log('[DEBUG] InstanceName:', instanceName);

    // 🔍 PASSO 1: Verificar se já existe uma instância para esta conta (por accountId)
    const existingInstance = await supabaseService.getInstanceByAccountId(targetAccountId);

    // Se já existe instância, apenas obtém o QR Code atual
    if (existingInstance) {
      console.log('[DEBUG] Instância já existe para este accountId, obtendo QR Code...');
      
      // Verificar status na Evolution API
      const evolutionStatus = await evolutionAPI.getInstanceStatus(existingInstance.name);

      // Se a instância está desconectada, obter novo QR Code
      if (evolutionStatus.data?.state === 'close' || !evolutionStatus.data?.state) {
        const connectResult = await evolutionAPI.connectInstance(existingInstance.name);
        
        if (connectResult.success) {
          // Atualizar status no banco para 'connecting'
          await supabaseService.updateInstance(existingInstance.id, {
            status: 'connecting',
          });
          
          return NextResponse.json({
            success: true,
            qrCode: connectResult.data?.base64 || connectResult.data?.code,
            instanceName: existingInstance.name,
            instanceId: existingInstance.id,
            status: 'connecting',
            message: 'Escaneie o QR Code com o WhatsApp para reconectar',
          });
        }
      }

      // Se já está conectada, retorna sucesso sem QR Code
      return NextResponse.json({
        success: true,
        qrCode: null,
        instanceName: existingInstance.name,
        instanceId: existingInstance.id,
        status: existingInstance.status,
        phoneNumber: existingInstance.phone_number,
        message: 'Instância já está conectada',
      });
    }

    // 🔍 PASSO 2: Se não existe, verificar se a instância já existe na Evolution API (pelo nome)
    // Isso pode acontecer se a instância foi criada mas não foi salva no Supabase
    const evolutionStatus = await evolutionAPI.getInstanceStatus(instanceName);
    
    if (evolutionStatus.success && evolutionStatus.data?.state) {
      // Instância existe na Evolution API, apenas salvar no Supabase e obter QR Code
      console.log('[DEBUG] Instância já existe na Evolution API, salvando no Supabase...');
      
      const instance = await supabaseService.createInstance({
        account_id: targetAccountId,
        name: instanceName,
        status: evolutionStatus.data.state === 'open' ? 'connected' : 'connecting',
      });

      if (instance) {
        const connectResult = await evolutionAPI.connectInstance(instanceName);
        
        return NextResponse.json({
          success: true,
          qrCode: connectResult.data?.base64 || connectResult.data?.code,
          instanceName,
          instanceId: instance.id,
          message: 'Escaneie o QR Code com o WhatsApp',
        });
      }
    }

    // 🔍 PASSO 3: Se não existe em lugar nenhum, criar nova instância
    console.log('[DEBUG] Criando nova instância...');
    const createResult = await evolutionAPI.createInstance(instanceName);

    if (!createResult.success) {
      console.error('[Evolution API] Erro ao criar instância:', createResult.error);
      return NextResponse.json(
        { 
          error: 'Erro ao criar instância', 
          details: createResult.error,
          hint: 'Verifique se a Evolution API está rodando em http://localhost:8080'
        },
        { status: 500 }
      );
    }

    // Salvar instância no Supabase
    const instance = await supabaseService.createInstance({
      account_id: targetAccountId,
      name: instanceName,
      status: 'connecting',
    });

    if (!instance) {
      console.error('Erro ao salvar instância no banco');
      // Tenta deletar a instância na Evolution API
      await evolutionAPI.deleteInstance(instanceName);
      return NextResponse.json(
        { error: 'Erro ao salvar instância no banco de dados' },
        { status: 500 }
      );
    }

    // Obter QR Code (pode não vir na criação, então obtemos separadamente)
    let qrCode = createResult.data?.base64 || createResult.data?.code;
    
    // Se não veio QR Code na criação, tenta obter via connect
    if (!qrCode) {
      const connectResult = await evolutionAPI.connectInstance(instanceName);
      if (connectResult.success) {
        qrCode = connectResult.data?.base64 || connectResult.data?.code;
      }
    }

    return NextResponse.json({
      success: true,
      qrCode: qrCode || null,
      instanceName,
      instanceId: instance.id,
      message: qrCode ? 'Escaneie o QR Code com o WhatsApp' : 'Instância criada. Use o endpoint de QR Code para obter o código.',
    });
  } catch (error) {
    console.error('Erro ao conectar instância:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

