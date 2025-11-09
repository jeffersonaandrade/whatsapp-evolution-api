import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabase } from '@/lib/supabase';
import { productsService } from '@/lib/services/products';

/**
 * Listar produtos
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createAuthenticatedSupabase();
    
    // Verificar autenticação
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
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

    const products = await productsService.getProducts(userData.account_id);

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Erro ao listar produtos:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * Criar produto
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createAuthenticatedSupabase();
    
    // Verificar autenticação
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { name, description, price, image_url } = await request.json();

    if (!name || !price) {
      return NextResponse.json(
        { error: 'name e price são obrigatórios' },
        { status: 400 }
      );
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

    const product = await productsService.createProduct({
      account_id: userData.account_id,
      name,
      description,
      price,
      image_url,
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Erro ao criar produto' },
        { status: 500 }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

