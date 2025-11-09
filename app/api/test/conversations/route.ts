import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/services/supabase-service';

/**
 * Rota de TESTE - Listar conversas (SEM autenticação)
 * ⚠️ REMOVER EM PRODUÇÃO
 */
export async function GET() {
  try {
    const mockAccountId = 'test-account-1';
    const conversations = await supabaseService.getConversations({ accountId: mockAccountId });
    
    return NextResponse.json({ 
      conversations,
      count: conversations.length,
    });
  } catch (error) {
    console.error('Erro ao listar conversas:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

