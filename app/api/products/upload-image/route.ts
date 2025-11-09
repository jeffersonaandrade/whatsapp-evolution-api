import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabase } from '@/lib/supabase';

/**
 * Upload de imagem de produto
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createAuthenticatedSupabase();
    
    // Verificar autenticação
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Arquivo não fornecido' }, { status: 400 });
    }

    // Validar tipo de arquivo
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo inválido. Use JPEG, PNG ou WebP' },
        { status: 400 }
      );
    }

    // Validar tamanho (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Máximo 5MB' },
        { status: 400 }
      );
    }

    // Gerar nome único
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    const filePath = `products/${fileName}`;

    // Converter File para ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload para Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('products')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError || !uploadData) {
      console.error('Erro ao fazer upload:', uploadError);
      return NextResponse.json(
        { error: 'Erro ao fazer upload da imagem' },
        { status: 500 }
      );
    }

    // Obter URL pública
    const { data: urlData } = supabase.storage
      .from('products')
      .getPublicUrl(filePath);

    return NextResponse.json({
      url: urlData.publicUrl,
    });
  } catch (error) {
    console.error('Erro ao fazer upload de imagem:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

