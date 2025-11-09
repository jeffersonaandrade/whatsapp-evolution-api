import { supabaseService } from './supabase-service';
import type { Product } from '@/types';

class ProductsService {
  /**
   * Busca todos os produtos de uma conta
   */
  async getProducts(accountId: string): Promise<Product[]> {
    return supabaseService.getProducts(accountId);
  }

  /**
   * Busca um produto por ID
   */
  async getProduct(productId: string): Promise<Product | null> {
    return supabaseService.getProductById(productId);
  }

  /**
   * Cria um novo produto
   */
  async createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product | null> {
    try {
      return await supabaseService.createProduct(product);
    } catch (error) {
      console.error('Erro ao criar produto:', error);
      return null;
    }
  }

  /**
   * Atualiza um produto
   */
  async updateProduct(productId: string, updates: Partial<Product>): Promise<boolean> {
    return supabaseService.updateProduct(productId, updates);
  }

  /**
   * Deleta um produto
   */
  async deleteProduct(productId: string): Promise<boolean> {
    return supabaseService.deleteProduct(productId);
  }
}

export const productsService = new ProductsService();

