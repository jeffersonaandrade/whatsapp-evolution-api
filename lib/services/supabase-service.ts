/**
 * Serviço de banco de dados
 * Usa SQLite como banco de dados principal
 */

import { sqliteService } from './sqlite-service';
import type { Instance, Contact, Conversation, Message, Product } from '@/types';

/**
 * Serviço de banco de dados
 * Delega todas as operações para o SQLiteService
 */
class SupabaseService {
  /**
   * Busca instância por nome
   */
  async getInstanceByName(instanceName: string): Promise<Instance | null> {
    return sqliteService.getInstanceByName(instanceName);
  }

  /**
   * Busca instância por ID
   */
  async getInstanceById(instanceId: string): Promise<Instance | null> {
    return sqliteService.getInstanceById(instanceId);
  }

  /**
   * Busca instância por accountId (primeira instância da conta)
   */
  async getInstanceByAccountId(accountId: string): Promise<Instance | null> {
    return sqliteService.getInstanceByAccountId(accountId);
  }

  /**
   * Cria instância
   */
  async createInstance(data: Omit<Instance, 'id' | 'created_at' | 'updated_at'>): Promise<Instance> {
    return sqliteService.createInstance(data);
  }

  /**
   * Atualiza instância
   */
  async updateInstance(instanceId: string, updates: Partial<Instance>): Promise<boolean> {
    return sqliteService.updateInstance(instanceId, updates);
  }

  /**
   * Busca ou cria contato
   */
  async findOrCreateContact(
    accountId: string,
    phoneNumber: string,
    name?: string
  ): Promise<Contact> {
    return sqliteService.findOrCreateContact(accountId, phoneNumber, name);
  }

  /**
   * Busca ou cria conversa
   */
  async findOrCreateConversation(
    instanceId: string,
    contactId: string,
    accountId: string
  ): Promise<Conversation> {
    return sqliteService.findOrCreateConversation(instanceId, contactId, accountId);
  }

  /**
   * Cria mensagem
   */
  async createMessage(data: Omit<Message, 'id' | 'created_at'>): Promise<Message> {
    return sqliteService.createMessage(data);
  }

  /**
   * Atualiza conversa
   */
  async updateConversation(
    conversationId: string,
    updates: Partial<Conversation>
  ): Promise<boolean> {
    return sqliteService.updateConversation(conversationId, updates);
  }

  /**
   * Busca conversas
   */
  async getConversations(filters?: {
    instanceId?: string;
    status?: string;
    accountId?: string;
  }): Promise<Conversation[]> {
    return sqliteService.getConversations(filters);
  }

  /**
   * Busca conversa por ID
   */
  async getConversationById(conversationId: string): Promise<Conversation | null> {
    return sqliteService.getConversationById(conversationId);
  }

  /**
   * Busca mensagens de uma conversa
   */
  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    return sqliteService.getMessagesByConversation(conversationId);
  }

  /**
   * Busca produtos
   */
  async getProducts(accountId: string): Promise<Product[]> {
    return sqliteService.getProducts(accountId);
  }

  /**
   * Cria produto
   */
  async createProduct(data: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
    return sqliteService.createProduct(data);
  }

  /**
   * Atualiza produto
   */
  async updateProduct(productId: string, updates: Partial<Product>): Promise<boolean> {
    return sqliteService.updateProduct(productId, updates);
  }

  /**
   * Deleta produto
   */
  async deleteProduct(productId: string): Promise<boolean> {
    return sqliteService.deleteProduct(productId);
  }

  /**
   * Busca produto por ID
   */
  async getProductById(productId: string): Promise<Product | null> {
    return sqliteService.getProductById(productId);
  }
}

export const supabaseService = new SupabaseService();

