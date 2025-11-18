/**
 * Serviço Mockado do Supabase
 * Use este serviço quando o Supabase não estiver configurado
 * Para migrar para Supabase real, substitua as chamadas por createServerSupabase()
 */

import type {
  Account,
  Instance,
  Contact,
  Conversation,
  Message,
  Product,
  WhatsAppGroup,
  Campaign,
} from '@/types';

// Armazenamento em memória (mock)
const mockData = {
  accounts: new Map<string, Account>(),
  users: new Map<string, any>(),
  instances: new Map<string, Instance>(),
  contacts: new Map<string, Contact>(),
  conversations: new Map<string, Conversation>(),
  messages: new Map<string, Message[]>(),
  products: new Map<string, Product[]>(),
  groups: new Map<string, WhatsAppGroup[]>(),
  campaigns: new Map<string, Campaign[]>(),
};

class MockSupabaseService {
  /**
   * Simula busca de instância por nome
   */
  async getInstanceByName(instanceName: string): Promise<Instance | null> {
    for (const instance of mockData.instances.values()) {
      if (instance.name === instanceName) {
        return instance;
      }
    }
    return null;
  }

  /**
   * Simula busca de instância por ID
   */
  async getInstanceById(instanceId: string): Promise<Instance | null> {
    return mockData.instances.get(instanceId) || null;
  }

  /**
   * Simula busca de instância por accountId
   */
  async getInstanceByAccountId(accountId: string): Promise<Instance | null> {
    for (const instance of mockData.instances.values()) {
      if (instance.account_id === accountId) {
        return instance;
      }
    }
    return null;
  }

  /**
   * Simula criação de instância
   */
  async createInstance(data: Omit<Instance, 'id' | 'created_at' | 'updated_at'>): Promise<Instance> {
    const instance: Instance = {
      id: `instance-${Date.now()}`,
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockData.instances.set(instance.id, instance);
    return instance;
  }

  /**
   * Simula atualização de instância
   */
  async updateInstance(instanceId: string, updates: Partial<Instance>): Promise<boolean> {
    const instance = mockData.instances.get(instanceId);
    if (!instance) return false;

    const updated = { ...instance, ...updates, updated_at: new Date().toISOString() };
    mockData.instances.set(instanceId, updated);
    return true;
  }

  /**
   * Simula busca ou criação de contato
   */
  async findOrCreateContact(
    accountId: string,
    phoneNumber: string,
    name?: string
  ): Promise<Contact> {
    // Busca contato existente
    for (const contact of mockData.contacts.values()) {
      if (contact.account_id === accountId && contact.phone_number === phoneNumber) {
        if (name && name !== contact.name) {
          const updated = { ...contact, name };
          mockData.contacts.set(contact.id, updated);
          return updated;
        }
        return contact;
      }
    }

    // Cria novo contato
    const contact: Contact = {
      id: `contact-${Date.now()}`,
      account_id: accountId,
      phone_number: phoneNumber,
      name: name || undefined,
      profile_pic_url: undefined,
      tags: [],
      created_at: new Date().toISOString(),
    };
    mockData.contacts.set(contact.id, contact);
    return contact;
  }

  /**
   * Simula busca ou criação de conversa
   */
  async findOrCreateConversation(
    instanceId: string,
    contactId: string,
    accountId: string
  ): Promise<Conversation> {
    // Busca conversa existente
    for (const conversation of mockData.conversations.values()) {
      if (conversation.instance_id === instanceId && conversation.contact_id === contactId) {
        return conversation;
      }
    }

    // Cria nova conversa
    const conversation: Conversation = {
      id: `conversation-${Date.now()}`,
      instance_id: instanceId,
      contact_id: contactId,
      status: 'bot',
      assigned_to: undefined,
      last_message_at: undefined,
      transferred_at: undefined,
      transfer_reason: undefined,
      bot_handoff_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockData.conversations.set(conversation.id, conversation);
    return conversation;
  }

  /**
   * Simula criação de mensagem
   */
  async createMessage(data: Omit<Message, 'id' | 'created_at'>): Promise<Message> {
    const message: Message = {
      id: `message-${Date.now()}`,
      ...data,
      created_at: new Date().toISOString(),
    };

    const messages = mockData.messages.get(data.conversation_id) || [];
    messages.push(message);
    mockData.messages.set(data.conversation_id, messages);

    return message;
  }

  /**
   * Simula atualização de conversa
   */
  async updateConversation(
    conversationId: string,
    updates: Partial<Conversation>
  ): Promise<boolean> {
    const conversation = mockData.conversations.get(conversationId);
    if (!conversation) return false;

    const updated = { ...conversation, ...updates, updated_at: new Date().toISOString() };
    mockData.conversations.set(conversationId, updated);
    return true;
  }

  /**
   * Simula busca de conversas
   */
  async getConversations(filters?: {
    instanceId?: string;
    status?: string;
    accountId?: string;
  }): Promise<Conversation[]> {
    let conversations = Array.from(mockData.conversations.values());

    // Filtrar por accountId (busca instâncias da conta)
    if (filters?.accountId) {
      const accountInstances = Array.from(mockData.instances.values()).filter(
        (i) => i.account_id === filters.accountId
      );
      const instanceIds = accountInstances.map((i) => i.id);
      conversations = conversations.filter((c) => instanceIds.includes(c.instance_id));
    }

    if (filters?.instanceId) {
      conversations = conversations.filter((c) => c.instance_id === filters.instanceId);
    }

    if (filters?.status) {
      conversations = conversations.filter((c) => c.status === filters.status);
    }

    return conversations.sort((a, b) => {
      const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return bTime - aTime;
    });
  }

  /**
   * Simula busca de conversa por ID
   */
  async getConversationById(conversationId: string): Promise<Conversation | null> {
    return mockData.conversations.get(conversationId) || null;
  }

  /**
   * Simula busca de mensagens de uma conversa
   */
  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    return mockData.messages.get(conversationId) || [];
  }

  /**
   * Simula busca de produtos
   */
  async getProducts(accountId: string): Promise<Product[]> {
    return mockData.products.get(accountId) || [];
  }

  /**
   * Simula criação de produto
   */
  async createProduct(data: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
    const product: Product = {
      id: `product-${Date.now()}`,
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const products = mockData.products.get(data.account_id) || [];
    products.push(product);
    mockData.products.set(data.account_id, products);

    return product;
  }

  /**
   * Simula atualização de produto
   */
  async updateProduct(productId: string, updates: Partial<Product>): Promise<boolean> {
    for (const [accountId, products] of mockData.products.entries()) {
      const index = products.findIndex((p) => p.id === productId);
      if (index !== -1) {
        products[index] = { ...products[index], ...updates, updated_at: new Date().toISOString() };
        mockData.products.set(accountId, products);
        return true;
      }
    }
    return false;
  }

  /**
   * Simula deleção de produto
   */
  async deleteProduct(productId: string): Promise<boolean> {
    for (const [accountId, products] of mockData.products.entries()) {
      const index = products.findIndex((p) => p.id === productId);
      if (index !== -1) {
        products.splice(index, 1);
        mockData.products.set(accountId, products);
        return true;
      }
    }
    return false;
  }

  /**
   * Simula busca de produto por ID
   */
  async getProductById(productId: string): Promise<Product | null> {
    for (const products of mockData.products.values()) {
      const product = products.find((p) => p.id === productId);
      if (product) return product;
    }
    return null;
  }

  /**
   * Limpa todos os dados mockados (útil para testes)
   */
  clearAll(): void {
    mockData.accounts.clear();
    mockData.users.clear();
    mockData.instances.clear();
    mockData.contacts.clear();
    mockData.conversations.clear();
    mockData.messages.clear();
    mockData.products.clear();
    mockData.groups.clear();
    mockData.campaigns.clear();
  }

  /**
   * Retorna todos os dados mockados (útil para debug)
   */
  getAllData() {
    return {
      accounts: Array.from(mockData.accounts.values()),
      users: Array.from(mockData.users.values()),
      instances: Array.from(mockData.instances.values()),
      contacts: Array.from(mockData.contacts.values()),
      conversations: Array.from(mockData.conversations.values()),
      messages: Array.from(mockData.messages.entries()).map(([id, msgs]) => ({
        conversationId: id,
        messages: msgs,
      })),
      products: Array.from(mockData.products.entries()).map(([accountId, prods]) => ({
        accountId,
        products: prods,
      })),
    };
  }
}

export const mockSupabaseService = new MockSupabaseService();

