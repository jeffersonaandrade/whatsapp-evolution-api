import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabase } from '@/lib/supabase';
import { productsService } from '@/lib/services/products';

/**
 * Atualizar produto
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createAuthenticatedSupabase();
    
    // Verificar autenticação
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const productId = params.id;
    const updates = await request.json();

    // Verificar se o produto pertence ao usuário
    const product = await productsService.getProduct(productId);
    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('account_id')
      .eq('id', user.id)
      .single();

    // Type assertion necessário devido ao select do Supabase
    const userAccountId = (userData as any)?.account_id;

    if (userAccountId !== product.account_id) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const success = await productsService.updateProduct(productId, updates);

    if (!success) {
      return NextResponse.json(
        { error: 'Erro ao atualizar produto' },
        { status: 500 }
      );
    }

    const updatedProduct = await productsService.getProduct(productId);
    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * Deletar produto
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createAuthenticatedSupabase();
    
    // Verificar autenticação
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const productId = params.id;

    // Verificar se o produto pertence ao usuário
    const product = await productsService.getProduct(productId);
    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('account_id')
      .eq('id', user.id)
      .single();

    // Type assertion necessário devido ao select do Supabase
    const userAccountId = (userData as any)?.account_id;

    if (userAccountId !== product.account_id) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const success = await productsService.deleteProduct(productId);

    if (!success) {
      return NextResponse.json(
        { error: 'Erro ao deletar produto' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar produto:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

