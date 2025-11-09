import { NextRequest, NextResponse } from 'next/server';
import { evolutionAPI } from '@/lib/evolution-api';

/**
 * Rota de TESTE - Enviar mensagem (SEM autenticação)
 * ⚠️ REMOVER EM PRODUÇÃO
 */
export async function POST(request: NextRequest) {
  try {
    const { instanceName, number, text } = await request.json();

    if (!instanceName || !number || !text) {
      return NextResponse.json(
        { error: 'instanceName, number e text são obrigatórios' },
        { status: 400 }
      );
    }

    const result = await evolutionAPI.sendTextMessage(instanceName, number, text);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Erro ao enviar mensagem', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Mensagem enviada com sucesso',
    });
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

