import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAuthenticatedSupabase } from '@/lib/supabase';
import { evolutionAPI } from '@/lib/evolution-api';

/**
 * Conectar instância WhatsApp
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createAuthenticatedSupabase();
    
    // Verificar autenticação
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { instanceName } = await request.json();

    if (!instanceName) {
      return NextResponse.json({ error: 'instanceName é obrigatório' }, { status: 400 });
    }

    // Buscar account_id do usuário
    const { data: userData } = await supabase
      .from('users')
      .select('account_id')
      .eq('id', user.id)
      .single();

    if (!userData?.account_id) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });
    }

    // Criar instância na Evolution API
    const result = await evolutionAPI.createInstance(instanceName);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Erro ao criar instância', details: result.error },
        { status: 500 }
      );
    }

    // Salvar instância no Supabase
    const { data: instance, error: dbError } = await supabase
      .from('instances')
      .insert({
        account_id: userData.account_id,
        name: instanceName,
        status: 'connecting',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError || !instance) {
      console.error('Erro ao salvar instância:', dbError);
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
    });
  } catch (error) {
    console.error('Erro ao conectar instância:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

