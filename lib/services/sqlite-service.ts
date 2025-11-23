/**
 * Serviço SQLite para substituir Supabase
 * Gerencia todas as operações de banco de dados usando SQLite
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import type { Instance, Contact, Conversation, Message, Product } from '@/types';

// Caminho do banco de dados
const DB_PATH = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'data', 'whatsapp.db');

// Garantir que o diretório existe
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Inicializar banco de dados
let db: Database.Database | null = null;

function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL'); // Write-Ahead Logging para melhor performance
    initializeSchema(db);
  }
  return db;
}

/**
 * Inicializa o schema do banco de dados
 */
function initializeSchema(database: Database.Database) {
  // Tabela instances
  database.exec(`
    CREATE TABLE IF NOT EXISTS instances (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      name TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL CHECK(status IN ('connected', 'disconnected', 'connecting')),
      phone_number TEXT,
      profile_pic_url TEXT,
      qr_code TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Tabela contacts
  database.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      name TEXT,
      profile_pic_url TEXT,
      tags TEXT, -- JSON array armazenado como texto
      created_at TEXT NOT NULL,
      UNIQUE(account_id, phone_number)
    )
  `);

  // Tabela conversations
  database.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      instance_id TEXT NOT NULL,
      contact_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('bot', 'waiting_agent', 'in_service', 'resolved')),
      assigned_to TEXT,
      last_message_at TEXT,
      transferred_at TEXT,
      transfer_reason TEXT,
      bot_handoff_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (instance_id) REFERENCES instances(id),
      FOREIGN KEY (contact_id) REFERENCES contacts(id)
    )
  `);

  // Tabela messages
  database.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      from_me INTEGER NOT NULL CHECK(from_me IN (0, 1)),
      body TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('sent', 'delivered', 'read')),
      sent_by TEXT NOT NULL CHECK(sent_by IN ('bot', 'agent', 'customer')),
      agent_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    )
  `);

  // Tabela products
  database.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      image_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Índices para melhor performance
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_instances_account_id ON instances(account_id);
    CREATE INDEX IF NOT EXISTS idx_instances_name ON instances(name);
    CREATE INDEX IF NOT EXISTS idx_contacts_account_phone ON contacts(account_id, phone_number);
    CREATE INDEX IF NOT EXISTS idx_conversations_instance ON conversations(instance_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_contact ON conversations(contact_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_products_account ON products(account_id);
  `);
}

/**
 * Utilitário para logs estruturados
 */
function log(level: 'info' | 'warn' | 'error', message: string, context?: Record<string, any>) {
  const timestamp = new Date().toISOString();
  if (level === 'error') {
    console.error(`[${timestamp}] [SQLiteService] [ERROR] ${message}`, context || '');
  } else if (level === 'warn') {
    console.warn(`[${timestamp}] [SQLiteService] [WARN] ${message}`, context || '');
  } else {
    console.log(`[${timestamp}] [SQLiteService] [INFO] ${message}`, context || '');
  }
}

/**
 * Gera ID único
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Converte objeto para JSON string (para campos JSON)
 */
function toJsonString(value: any): string | null {
  if (value === null || value === undefined) return null;
  return JSON.stringify(value);
}

/**
 * Converte JSON string para objeto
 */
function fromJsonString(value: string | null): any {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

class SQLiteService {
  /**
   * Busca instância por nome
   */
  async getInstanceByName(instanceName: string): Promise<Instance | null> {
    try {
      const database = getDatabase();
      const stmt = database.prepare('SELECT * FROM instances WHERE name = ?');
      const row = stmt.get(instanceName) as any;
      
      if (!row) return null;
      
      return {
        id: row.id,
        account_id: row.account_id,
        name: row.name,
        status: row.status,
        phone_number: row.phone_number || undefined,
        profile_pic_url: row.profile_pic_url || undefined,
        qr_code: row.qr_code || undefined,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    } catch (error) {
      log('error', 'Erro ao buscar instância por nome', { instanceName, error });
      return null;
    }
  }

  /**
   * Busca instância por ID
   */
  async getInstanceById(instanceId: string): Promise<Instance | null> {
    try {
      const database = getDatabase();
      const stmt = database.prepare('SELECT * FROM instances WHERE id = ?');
      const row = stmt.get(instanceId) as any;
      
      if (!row) return null;
      
      return {
        id: row.id,
        account_id: row.account_id,
        name: row.name,
        status: row.status,
        phone_number: row.phone_number || undefined,
        profile_pic_url: row.profile_pic_url || undefined,
        qr_code: row.qr_code || undefined,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    } catch (error) {
      log('error', 'Erro ao buscar instância por ID', { instanceId, error });
      return null;
    }
  }

  /**
   * Busca instância por accountId
   */
  async getInstanceByAccountId(accountId: string): Promise<Instance | null> {
    try {
      log('info', 'Buscando instância por accountId', { accountId });
      
      const database = getDatabase();
      const stmt = database.prepare('SELECT * FROM instances WHERE account_id = ? LIMIT 1');
      const row = stmt.get(accountId) as any;
      
      if (!row) {
        log('info', 'Nenhuma instância encontrada para accountId', { accountId });
        return null;
      }
      
      log('info', 'Instância encontrada por accountId', {
        accountId,
        instanceId: row.id,
        instanceName: row.name,
        status: row.status,
      });
      
      return {
        id: row.id,
        account_id: row.account_id,
        name: row.name,
        status: row.status,
        phone_number: row.phone_number || undefined,
        profile_pic_url: row.profile_pic_url || undefined,
        qr_code: row.qr_code || undefined,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    } catch (error) {
      log('error', 'Erro ao buscar instância por accountId', { accountId, error });
      return null;
    }
  }

  /**
   * Cria instância
   */
  async createInstance(data: Omit<Instance, 'id' | 'created_at' | 'updated_at'>): Promise<Instance> {
    try {
      log('info', 'Criando instância no SQLite', {
        accountId: data.account_id,
        instanceName: data.name,
        status: data.status,
      });
      
      const database = getDatabase();
      const now = new Date().toISOString();
      const id = generateId();
      
      const stmt = database.prepare(`
        INSERT INTO instances (id, account_id, name, status, phone_number, profile_pic_url, qr_code, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        id,
        data.account_id,
        data.name,
        data.status,
        data.phone_number || null,
        data.profile_pic_url || null,
        data.qr_code || null,
        now,
        now
      );
      
      const instance: Instance = {
        id,
        ...data,
        created_at: now,
        updated_at: now,
      };
      
      log('info', 'Instância criada com sucesso no SQLite', {
        accountId: data.account_id,
        instanceId: id,
        instanceName: data.name,
        status: data.status,
      });
      
      return instance;
    } catch (error: any) {
      log('error', 'Erro ao criar instância no SQLite', {
        accountId: data.account_id,
        instanceName: data.name,
        error: error?.message,
      });
      throw new Error(`Erro ao criar instância: ${error?.message || 'Erro desconhecido'}`);
    }
  }

  /**
   * Atualiza instância
   */
  async updateInstance(instanceId: string, updates: Partial<Instance>): Promise<boolean> {
    try {
      const database = getDatabase();
      const now = new Date().toISOString();
      
      const fields: string[] = [];
      const values: any[] = [];
      
      if (updates.status !== undefined) {
        fields.push('status = ?');
        values.push(updates.status);
      }
      if (updates.phone_number !== undefined) {
        fields.push('phone_number = ?');
        values.push(updates.phone_number || null);
      }
      if (updates.profile_pic_url !== undefined) {
        fields.push('profile_pic_url = ?');
        values.push(updates.profile_pic_url || null);
      }
      if (updates.qr_code !== undefined) {
        fields.push('qr_code = ?');
        values.push(updates.qr_code || null);
      }
      
      fields.push('updated_at = ?');
      values.push(now);
      values.push(instanceId);
      
      const stmt = database.prepare(`UPDATE instances SET ${fields.join(', ')} WHERE id = ?`);
      const result = stmt.run(...values);
      
      return result.changes > 0;
    } catch (error) {
      log('error', 'Erro ao atualizar instância', { instanceId, error });
      return false;
    }
  }

  /**
   * Busca ou cria contato
   */
  async findOrCreateContact(
    accountId: string,
    phoneNumber: string,
    name?: string
  ): Promise<Contact> {
    try {
      const database = getDatabase();
      
      // Busca contato existente
      const findStmt = database.prepare('SELECT * FROM contacts WHERE account_id = ? AND phone_number = ?');
      const existing = findStmt.get(accountId, phoneNumber) as any;
      
      if (existing) {
        // Atualiza nome se fornecido e diferente
        if (name && name !== existing.name) {
          const updateStmt = database.prepare('UPDATE contacts SET name = ? WHERE id = ?');
          updateStmt.run(name, existing.id);
          return { ...existing, name };
        }
        return {
          id: existing.id,
          account_id: existing.account_id,
          phone_number: existing.phone_number,
          name: existing.name || undefined,
          profile_pic_url: existing.profile_pic_url || undefined,
          tags: fromJsonString(existing.tags) || undefined,
          created_at: existing.created_at,
        };
      }
      
      // Cria novo contato
      const id = generateId();
      const now = new Date().toISOString();
      const insertStmt = database.prepare(`
        INSERT INTO contacts (id, account_id, phone_number, name, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      insertStmt.run(id, accountId, phoneNumber, name || null, now);
      
      return {
        id,
        account_id: accountId,
        phone_number: phoneNumber,
        name: name || undefined,
        created_at: now,
      };
    } catch (error: any) {
      log('error', 'Erro ao buscar/criar contato', { accountId, phoneNumber, error });
      throw new Error(`Erro ao criar contato: ${error?.message}`);
    }
  }

  /**
   * Busca ou cria conversa
   */
  async findOrCreateConversation(
    instanceId: string,
    contactId: string,
    accountId: string
  ): Promise<Conversation> {
    try {
      const database = getDatabase();
      
      // Busca conversa existente
      const findStmt = database.prepare(`
        SELECT * FROM conversations 
        WHERE instance_id = ? AND contact_id = ? 
        ORDER BY created_at DESC LIMIT 1
      `);
      const existing = findStmt.get(instanceId, contactId) as any;
      
      if (existing) {
        return {
          id: existing.id,
          instance_id: existing.instance_id,
          contact_id: existing.contact_id,
          status: existing.status,
          assigned_to: existing.assigned_to || undefined,
          last_message_at: existing.last_message_at || undefined,
          transferred_at: existing.transferred_at || undefined,
          transfer_reason: existing.transfer_reason || undefined,
          bot_handoff_count: existing.bot_handoff_count,
          created_at: existing.created_at,
          updated_at: existing.updated_at,
        };
      }
      
      // Cria nova conversa
      const id = generateId();
      const now = new Date().toISOString();
      const insertStmt = database.prepare(`
        INSERT INTO conversations (id, instance_id, contact_id, status, bot_handoff_count, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      insertStmt.run(id, instanceId, contactId, 'bot', 0, now, now);
      
      return {
        id,
        instance_id: instanceId,
        contact_id: contactId,
        status: 'bot',
        bot_handoff_count: 0,
        created_at: now,
        updated_at: now,
      };
    } catch (error: any) {
      log('error', 'Erro ao buscar/criar conversa', { instanceId, contactId, error });
      throw new Error(`Erro ao criar conversa: ${error?.message}`);
    }
  }

  /**
   * Cria mensagem
   */
  async createMessage(data: Omit<Message, 'id' | 'created_at'>): Promise<Message> {
    try {
      const database = getDatabase();
      const id = generateId();
      const now = new Date().toISOString();
      
      const stmt = database.prepare(`
        INSERT INTO messages (id, conversation_id, from_me, body, timestamp, status, sent_by, agent_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        id,
        data.conversation_id,
        data.from_me ? 1 : 0,
        data.body,
        data.timestamp,
        data.status,
        data.sent_by,
        data.agent_id || null,
        now
      );
      
      return {
        id,
        ...data,
        created_at: now,
      };
    } catch (error: any) {
      log('error', 'Erro ao criar mensagem', { error });
      throw new Error(`Erro ao criar mensagem: ${error?.message}`);
    }
  }

  /**
   * Atualiza conversa
   */
  async updateConversation(
    conversationId: string,
    updates: Partial<Conversation>
  ): Promise<boolean> {
    try {
      const database = getDatabase();
      const now = new Date().toISOString();
      
      const fields: string[] = [];
      const values: any[] = [];
      
      if (updates.status !== undefined) {
        fields.push('status = ?');
        values.push(updates.status);
      }
      if (updates.assigned_to !== undefined) {
        fields.push('assigned_to = ?');
        values.push(updates.assigned_to || null);
      }
      if (updates.last_message_at !== undefined) {
        fields.push('last_message_at = ?');
        values.push(updates.last_message_at || null);
      }
      if (updates.transferred_at !== undefined) {
        fields.push('transferred_at = ?');
        values.push(updates.transferred_at || null);
      }
      if (updates.transfer_reason !== undefined) {
        fields.push('transfer_reason = ?');
        values.push(updates.transfer_reason || null);
      }
      if (updates.bot_handoff_count !== undefined) {
        fields.push('bot_handoff_count = ?');
        values.push(updates.bot_handoff_count);
      }
      
      fields.push('updated_at = ?');
      values.push(now);
      values.push(conversationId);
      
      const stmt = database.prepare(`UPDATE conversations SET ${fields.join(', ')} WHERE id = ?`);
      const result = stmt.run(...values);
      
      return result.changes > 0;
    } catch (error) {
      log('error', 'Erro ao atualizar conversa', { conversationId, error });
      return false;
    }
  }

  /**
   * Busca conversas
   */
  async getConversations(filters?: {
    instanceId?: string;
    status?: string;
    accountId?: string;
  }): Promise<Conversation[]> {
    try {
      const database = getDatabase();
      let query = 'SELECT * FROM conversations';
      const conditions: string[] = [];
      const params: any[] = [];
      
      // Se filtrar por accountId, precisa fazer join com instances
      if (filters?.accountId) {
        query = `
          SELECT c.* FROM conversations c
          INNER JOIN instances i ON c.instance_id = i.id
          WHERE i.account_id = ?
        `;
        params.push(filters.accountId);
        
        if (filters?.status) {
          query += ' AND c.status = ?';
          params.push(filters.status);
        }
      } else {
        if (filters?.instanceId) {
          conditions.push('instance_id = ?');
          params.push(filters.instanceId);
        }
        
        if (filters?.status) {
          conditions.push('status = ?');
          params.push(filters.status);
        }
        
        if (conditions.length > 0) {
          query += ' WHERE ' + conditions.join(' AND ');
        }
      }
      
      // SQLite não suporta NULLS LAST diretamente, então usamos COALESCE para colocar NULLs no final
      query += ' ORDER BY COALESCE(last_message_at, \'1970-01-01\') DESC, created_at DESC';
      
      const stmt = database.prepare(query);
      const rows = stmt.all(...params) as any[];
      
      return rows.map(row => ({
        id: row.id,
        instance_id: row.instance_id,
        contact_id: row.contact_id,
        status: row.status,
        assigned_to: row.assigned_to || undefined,
        last_message_at: row.last_message_at || undefined,
        transferred_at: row.transferred_at || undefined,
        transfer_reason: row.transfer_reason || undefined,
        bot_handoff_count: row.bot_handoff_count,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
    } catch (error) {
      log('error', 'Erro ao buscar conversas', { error });
      return [];
    }
  }

  /**
   * Busca conversa por ID
   */
  async getConversationById(conversationId: string): Promise<Conversation | null> {
    try {
      const database = getDatabase();
      const stmt = database.prepare('SELECT * FROM conversations WHERE id = ?');
      const row = stmt.get(conversationId) as any;
      
      if (!row) return null;
      
      return {
        id: row.id,
        instance_id: row.instance_id,
        contact_id: row.contact_id,
        status: row.status,
        assigned_to: row.assigned_to || undefined,
        last_message_at: row.last_message_at || undefined,
        transferred_at: row.transferred_at || undefined,
        transfer_reason: row.transfer_reason || undefined,
        bot_handoff_count: row.bot_handoff_count,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    } catch (error) {
      log('error', 'Erro ao buscar conversa por ID', { conversationId, error });
      return null;
    }
  }

  /**
   * Busca mensagens de uma conversa
   */
  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    try {
      const database = getDatabase();
      const stmt = database.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC');
      const rows = stmt.all(conversationId) as any[];
      
      return rows.map(row => ({
        id: row.id,
        conversation_id: row.conversation_id,
        from_me: row.from_me === 1,
        body: row.body,
        timestamp: row.timestamp,
        status: row.status,
        sent_by: row.sent_by,
        agent_id: row.agent_id || undefined,
        created_at: row.created_at,
      }));
    } catch (error) {
      log('error', 'Erro ao buscar mensagens', { conversationId, error });
      return [];
    }
  }

  /**
   * Busca produtos
   */
  async getProducts(accountId: string): Promise<Product[]> {
    try {
      const database = getDatabase();
      const stmt = database.prepare('SELECT * FROM products WHERE account_id = ? ORDER BY created_at DESC');
      const rows = stmt.all(accountId) as any[];
      
      return rows.map(row => ({
        id: row.id,
        account_id: row.account_id,
        name: row.name,
        description: row.description || undefined,
        price: row.price,
        image_url: row.image_url || undefined,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
    } catch (error) {
      log('error', 'Erro ao buscar produtos', { accountId, error });
      return [];
    }
  }

  /**
   * Cria produto
   */
  async createProduct(data: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
    try {
      const database = getDatabase();
      const id = generateId();
      const now = new Date().toISOString();
      
      const stmt = database.prepare(`
        INSERT INTO products (id, account_id, name, description, price, image_url, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        id,
        data.account_id,
        data.name,
        data.description || null,
        data.price,
        data.image_url || null,
        now,
        now
      );
      
      return {
        id,
        ...data,
        created_at: now,
        updated_at: now,
      };
    } catch (error: any) {
      log('error', 'Erro ao criar produto', { error });
      throw new Error(`Erro ao criar produto: ${error?.message}`);
    }
  }

  /**
   * Atualiza produto
   */
  async updateProduct(productId: string, updates: Partial<Product>): Promise<boolean> {
    try {
      const database = getDatabase();
      const now = new Date().toISOString();
      
      const fields: string[] = [];
      const values: any[] = [];
      
      if (updates.name !== undefined) {
        fields.push('name = ?');
        values.push(updates.name);
      }
      if (updates.description !== undefined) {
        fields.push('description = ?');
        values.push(updates.description || null);
      }
      if (updates.price !== undefined) {
        fields.push('price = ?');
        values.push(updates.price);
      }
      if (updates.image_url !== undefined) {
        fields.push('image_url = ?');
        values.push(updates.image_url || null);
      }
      
      fields.push('updated_at = ?');
      values.push(now);
      values.push(productId);
      
      const stmt = database.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`);
      const result = stmt.run(...values);
      
      return result.changes > 0;
    } catch (error) {
      log('error', 'Erro ao atualizar produto', { productId, error });
      return false;
    }
  }

  /**
   * Deleta produto
   */
  async deleteProduct(productId: string): Promise<boolean> {
    try {
      const database = getDatabase();
      const stmt = database.prepare('DELETE FROM products WHERE id = ?');
      const result = stmt.run(productId);
      return result.changes > 0;
    } catch (error) {
      log('error', 'Erro ao deletar produto', { productId, error });
      return false;
    }
  }

  /**
   * Busca produto por ID
   */
  async getProductById(productId: string): Promise<Product | null> {
    try {
      const database = getDatabase();
      const stmt = database.prepare('SELECT * FROM products WHERE id = ?');
      const row = stmt.get(productId) as any;
      
      if (!row) return null;
      
      return {
        id: row.id,
        account_id: row.account_id,
        name: row.name,
        description: row.description || undefined,
        price: row.price,
        image_url: row.image_url || undefined,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    } catch (error) {
      log('error', 'Erro ao buscar produto por ID', { productId, error });
      return null;
    }
  }

  /**
   * Fecha conexão com o banco (útil para testes)
   */
  close(): void {
    if (db) {
      db.close();
      db = null;
    }
  }
}

export const sqliteService = new SQLiteService();

