import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { supabaseService } from '@/lib/services/supabase-service';

/**
 * Listar conversas
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user?.accountId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get('instanceId');
    const status = searchParams.get('status');

    // Buscar conversas via SQLite com filtros
    const conversations = await supabaseService.getConversations({
      accountId: user.accountId,
      instanceId: instanceId || undefined,
      status: status || undefined,
    });

    // Enriquecer com contact e instance (para manter compatibilidade)
    const conversationsWithRelations = await Promise.all(
      conversations.map(async (c: any) => {
        const [contact, instance] = await Promise.all([
          supabaseService.getContactById(c.contact_id),
          supabaseService.getInstanceById(c.instance_id),
        ]);
        return {
          ...c,
          contact: contact || null,
          instance: instance || null,
        };
      })
    );

    return NextResponse.json({ conversations: conversationsWithRelations });
  } catch (error) {
    console.error('Erro ao listar conversas:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

