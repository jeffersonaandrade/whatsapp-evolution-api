import { NextRequest, NextResponse } from 'next/server';
import { evolutionAPI } from '@/lib/evolution-api';

/**
 * Rota de TESTE - Obter QR Code da instância (SEM autenticação)
 * ⚠️ REMOVER EM PRODUÇÃO
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instanceName = searchParams.get('instanceName');

    if (!instanceName) {
      return NextResponse.json(
        { error: 'instanceName é obrigatório (query param)' },
        { status: 400 }
      );
    }

    // Obter QR Code da Evolution API
    const result = await evolutionAPI.connectInstance(instanceName);

    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Erro ao obter QR Code', 
          details: result.error 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      qrCode: result.data?.base64 || result.data?.code,
      instanceName,
      message: 'Escaneie este QR Code no WhatsApp',
    });
  } catch (error) {
    console.error('Erro ao obter QR Code:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

