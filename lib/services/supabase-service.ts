/**
 * Serviço Supabase com fallback para mock
 * Usa Supabase real se configurado, caso contrário usa mock
 */

import { createServerSupabase } from '@/lib/supabase';
import { mockSupabaseService } from './mock-supabase';
import type { Instance, Contact, Conversation, Message, Product } from '@/types';

const USE_MOCK = process.env.USE_MOCK_SUPABASE === 'true' || !process.env.NEXT_PUBLIC_SUPABASE_URL;

/**
 * Utilitário para logs estruturados
 */
function log(level: 'info' | 'warn' | 'error', message: string, context?: Record<string, any>) {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    level,
    service: 'SupabaseService',
    message,
    ...context,
  };
  
  if (level === 'error') {
    console.error(`[${timestamp}] [SupabaseService] [ERROR] ${message}`, context || '');
  } else if (level === 'warn') {
    console.warn(`[${timestamp}] [SupabaseService] [WARN] ${message}`, context || '');
  } else {
    console.log(`[${timestamp}] [SupabaseService] [INFO] ${message}`, context || '');
  }
}

class SupabaseService {
  /**
   * Busca instância por nome
   */
  async getInstanceByName(instanceName: string): Promise<Instance | null> {
    if (USE_MOCK) {
      return mockSupabaseService.getInstanceByName(instanceName);
    }

    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from('instances')
      .select('*')
      .eq('name', instanceName)
      .single();

    if (error || !data) return null;
    return data as Instance;
  }

  /**
   * Busca instância por ID
   */
  async getInstanceById(instanceId: string): Promise<Instance | null> {
    if (USE_MOCK) {
      return mockSupabaseService.getInstanceById(instanceId);
    }

    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from('instances')
      .select('*')
      .eq('id', instanceId)
      .single();

    if (error || !data) return null;
    return data as Instance;
  }

  /**
   * Busca instância por accountId (primeira instância da conta)
   */
  async getInstanceByAccountId(accountId: string): Promise<Instance | null> {
    if (USE_MOCK) {
      log('info', 'Usando mock para buscar instância por accountId', { accountId });
      return mockSupabaseService.getInstanceByAccountId?.(accountId) || null;
    }

    log('info', 'Buscando instância por accountId', { accountId });

    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from('instances')
      .select('*')
      .eq('account_id', accountId)
      .maybeSingle();

    if (error) {
      log('error', 'Erro ao buscar instância por accountId', {
        accountId,
        error: error.message,
        code: error.code,
        details: error.details,
      });
      return null;
    }

    if (!data) {
      log('info', 'Nenhuma instância encontrada para accountId', { accountId });
      return null;
    }

    log('info', 'Instância encontrada por accountId', {
      accountId,
      instanceId: data.id,
      instanceName: data.name,
      status: data.status,
    });

    return data as Instance;
  }

  /**
   * Cria instância
   */
  async createInstance(data: Omit<Instance, 'id' | 'created_at' | 'updated_at'>): Promise<Instance> {
    if (USE_MOCK) {
      log('info', 'Usando mock para criar instância', { accountId: data.account_id, instanceName: data.name });
      return mockSupabaseService.createInstance(data);
    }

    log('info', 'Criando instância no Supabase', {
      accountId: data.account_id,
      instanceName: data.name,
      status: data.status,
    });

    const supabase = createServerSupabase();
    const { data: instance, error } = await supabase
      .from('instances')
      .insert({
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !instance) {
      log('error', 'Erro ao criar instância no Supabase', {
        accountId: data.account_id,
        instanceName: data.name,
        error: error?.message || 'Instância não retornada',
        code: error?.code,
        details: error?.details,
      });
      throw new Error(`Erro ao criar instância: ${error?.message || 'Instância não retornada'}`);
    }

    log('info', 'Instância criada com sucesso no Supabase', {
      accountId: data.account_id,
      instanceId: instance.id,
      instanceName: instance.name,
      status: instance.status,
    });

    return instance as Instance;
  }

  /**
   * Atualiza instância
   */
  async updateInstance(instanceId: string, updates: Partial<Instance>): Promise<boolean> {
    if (USE_MOCK) {
      return mockSupabaseService.updateInstance(instanceId, updates);
    }

    const supabase = createServerSupabase();
    const { error } = await supabase
      .from('instances')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', instanceId);

    return !error;
  }

  /**
   * Busca ou cria contato
   */
  async findOrCreateContact(
    accountId: string,
    phoneNumber: string,
    name?: string
  ): Promise<Contact> {
    if (USE_MOCK) {
      return mockSupabaseService.findOrCreateContact(accountId, phoneNumber, name);
    }

    const supabase = createServerSupabase();

    // Busca contato existente
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('*')
      .eq('account_id', accountId)
      .eq('phone_number', phoneNumber)
      .single();

    if (existingContact) {
      if (name && name !== existingContact.name) {
        await supabase
          .from('contacts')
          .update({ name })
          .eq('id', existingContact.id);
        return { ...existingContact, name } as Contact;
      }
      return existingContact as Contact;
    }

    // Cria novo contato
    const { data: newContact, error } = await supabase
      .from('contacts')
      .insert({
        account_id: accountId,
        phone_number: phoneNumber,
        name: name || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !newContact) {
      throw new Error(`Erro ao criar contato: ${error?.message}`);
    }

    return newContact as Contact;
  }

  /**
   * Busca ou cria conversa
   */
  async findOrCreateConversation(
    instanceId: string,
    contactId: string,
    accountId: string
  ): Promise<Conversation> {
    if (USE_MOCK) {
      return mockSupabaseService.findOrCreateConversation(instanceId, contactId, accountId);
    }

    const supabase = createServerSupabase();

    // Busca conversa existente
    const { data: existingConversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('instance_id', instanceId)
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingConversation) {
      return existingConversation as Conversation;
    }

    // Cria nova conversa
    const { data: newConversation, error } = await supabase
      .from('conversations')
      .insert({
        instance_id: instanceId,
        contact_id: contactId,
        status: 'bot',
        bot_handoff_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !newConversation) {
      throw new Error(`Erro ao criar conversa: ${error?.message}`);
    }

    return newConversation as Conversation;
  }

  /**
   * Cria mensagem
   */
  async createMessage(data: Omit<Message, 'id' | 'created_at'>): Promise<Message> {
    if (USE_MOCK) {
      return mockSupabaseService.createMessage(data);
    }

    const supabase = createServerSupabase();
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        ...data,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !message) {
      throw new Error(`Erro ao criar mensagem: ${error?.message}`);
    }

    return message as Message;
  }

  /**
   * Atualiza conversa
   */
  async updateConversation(
    conversationId: string,
    updates: Partial<Conversation>
  ): Promise<boolean> {
    if (USE_MOCK) {
      return mockSupabaseService.updateConversation(conversationId, updates);
    }

    const supabase = createServerSupabase();
    const { error } = await supabase
      .from('conversations')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    return !error;
  }

  /**
   * Busca conversas
   */
  async getConversations(filters?: {
    instanceId?: string;
    status?: string;
    accountId?: string;
  }): Promise<Conversation[]> {
    if (USE_MOCK) {
      return mockSupabaseService.getConversations(filters);
    }

    const supabase = createServerSupabase();
    
    // Se filtrar por accountId, precisa fazer join com instances
    if (filters?.accountId) {
      const { data: instances } = await supabase
        .from('instances')
        .select('id')
        .eq('account_id', filters.accountId);
      
      const instanceIds = instances?.map((i) => i.id) || [];
      
      if (instanceIds.length === 0) {
        return [];
      }
      
      let query = supabase
        .from('conversations')
        .select('*')
        .in('instance_id', instanceIds);
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      const { data, error } = await query.order('last_message_at', {
        ascending: false,
        nullsFirst: false,
      });
      
      if (error) {
        console.error('Erro ao buscar conversas:', error);
        return [];
      }
      
      return (data || []) as Conversation[];
    }
    
    // Filtro normal sem accountId
    let query = supabase.from('conversations').select('*');

    if (filters?.instanceId) {
      query = query.eq('instance_id', filters.instanceId);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query.order('last_message_at', {
      ascending: false,
      nullsFirst: false,
    });

    if (error) {
      console.error('Erro ao buscar conversas:', error);
      return [];
    }

    return (data || []) as Conversation[];
  }

  /**
   * Busca conversa por ID
   */
  async getConversationById(conversationId: string): Promise<Conversation | null> {
    if (USE_MOCK) {
      return mockSupabaseService.getConversationById(conversationId);
    }

    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (error || !data) return null;
    return data as Conversation;
  }

  /**
   * Busca mensagens de uma conversa
   */
  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    if (USE_MOCK) {
      return mockSupabaseService.getMessagesByConversation(conversationId);
    }

    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erro ao buscar mensagens:', error);
      return [];
    }

    return (data || []) as Message[];
  }

  /**
   * Busca produtos
   */
  async getProducts(accountId: string): Promise<Product[]> {
    if (USE_MOCK) {
      return mockSupabaseService.getProducts(accountId);
    }

    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar produtos:', error);
      return [];
    }

    return (data || []) as Product[];
  }

  /**
   * Cria produto
   */
  async createProduct(data: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
    if (USE_MOCK) {
      return mockSupabaseService.createProduct(data);
    }

    const supabase = createServerSupabase();
    const { data: product, error } = await supabase
      .from('products')
      .insert({
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !product) {
      throw new Error(`Erro ao criar produto: ${error?.message}`);
    }

    return product as Product;
  }

  /**
   * Atualiza produto
   */
  async updateProduct(productId: string, updates: Partial<Product>): Promise<boolean> {
    if (USE_MOCK) {
      return mockSupabaseService.updateProduct(productId, updates);
    }

    const supabase = createServerSupabase();
    const { error } = await supabase
      .from('products')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId);

    return !error;
  }

  /**
   * Deleta produto
   */
  async deleteProduct(productId: string): Promise<boolean> {
    if (USE_MOCK) {
      return mockSupabaseService.deleteProduct(productId);
    }

    const supabase = createServerSupabase();
    const { error } = await supabase.from('products').delete().eq('id', productId);

    return !error;
  }

  /**
   * Busca produto por ID
   */
  async getProductById(productId: string): Promise<Product | null> {
    if (USE_MOCK) {
      return mockSupabaseService.getProductById(productId);
    }

    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (error || !data) return null;
    return data as Product;
  }
}

export const supabaseService = new SupabaseService();

