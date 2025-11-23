import { NextRequest, NextResponse } from 'next/server';
import { productsService } from '@/lib/services/products';
import { getAuthenticatedUser } from '@/lib/auth';

/**
 * Listar produtos
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user?.accountId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const products = await productsService.getProducts(user.accountId);

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
    const user = await getAuthenticatedUser(request);
    if (!user?.accountId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { name, description, price, image_url } = await request.json();

    if (!name || !price) {
      return NextResponse.json(
        { error: 'name e price são obrigatórios' },
        { status: 400 }
      );
    }

    const product = await productsService.createProduct({
      account_id: user.accountId,
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

