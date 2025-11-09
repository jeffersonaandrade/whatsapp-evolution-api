import { NextRequest, NextResponse } from 'next/server';
import { evolutionAPI } from '@/lib/evolution-api';
import { supabaseService } from '@/lib/services/supabase-service';

/**
 * Rota de TESTE - Conectar instância WhatsApp (SEM autenticação)
 * ⚠️ REMOVER EM PRODUÇÃO
 */
export async function POST(request: NextRequest) {
  try {
    const { instanceName } = await request.json();

    if (!instanceName) {
      return NextResponse.json(
        { error: 'instanceName é obrigatório' },
        { status: 400 }
      );
    }

    // Criar instância na Evolution API
    const result = await evolutionAPI.createInstance(instanceName);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Erro ao criar instância', details: result.error },
        { status: 500 }
      );
    }

    // Salvar instância no mock (ou Supabase se configurado)
    // Para teste, vamos usar um account_id mockado
    const mockAccountId = 'test-account-1';
    
    const instance = await supabaseService.createInstance({
      account_id: mockAccountId,
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

    return NextResponse.json({
      success: true,
      qrCode: result.data?.base64 || result.data?.code,
      instanceName,
      instanceId: instance.id,
      message: 'Escaneie o QR Code com o WhatsApp',
    });
  } catch (error) {
    console.error('Erro ao conectar instância:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

