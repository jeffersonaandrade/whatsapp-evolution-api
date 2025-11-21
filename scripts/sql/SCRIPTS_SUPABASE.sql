-- Scripts SQL para criar as tabelas no Supabase
-- Execute estes scripts no SQL Editor do Supabase

-- ============================================
-- TABELA: accounts (Contas - Multi-tenancy)
-- ============================================
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company_name TEXT,
  business_type TEXT,
  business_description TEXT,
  opening_hours JSONB,
  address TEXT,
  phone TEXT,
  delivery_available BOOLEAN DEFAULT false,
  delivery_fee DECIMAL(10, 2),
  welcome_message TEXT,
  default_message TEXT,
  transfer_keywords TEXT[],
  transfer_message TEXT,
  bot_personality TEXT,
  groq_api_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: users (Usuários - Supabase Auth)
-- ============================================
-- Nota: A tabela auth.users é gerenciada pelo Supabase Auth
-- Esta tabela estende os dados do usuário
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  role TEXT DEFAULT 'agent', -- 'admin' | 'agent'
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: instances (Instâncias WhatsApp)
-- ============================================
CREATE TABLE IF NOT EXISTS instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL UNIQUE, -- Nome da instância na Evolution API
  status TEXT NOT NULL DEFAULT 'disconnected', -- 'connected' | 'disconnected' | 'connecting'
  phone_number TEXT,
  profile_pic_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: contacts (Contatos)
-- ============================================
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  name TEXT,
  profile_pic_url TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id, phone_number)
);

-- ============================================
-- TABELA: conversations (Conversas)
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'bot', -- 'bot' | 'waiting_agent' | 'in_service' | 'resolved'
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ,
  transferred_at TIMESTAMPTZ,
  transfer_reason TEXT,
  bot_handoff_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: messages (Mensagens)
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  from_me BOOLEAN NOT NULL,
  body TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent', -- 'sent' | 'delivered' | 'read'
  sent_by TEXT NOT NULL DEFAULT 'customer', -- 'bot' | 'agent' | 'customer'
  agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: products (Produtos)
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: groups (Grupos WhatsApp)
-- ============================================
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  group_id TEXT NOT NULL UNIQUE, -- ID do grupo no WhatsApp
  name TEXT NOT NULL,
  description TEXT,
  auto_subscribe BOOLEAN DEFAULT false,
  keywords TEXT[],
  welcome_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: campaigns (Campanhas)
-- ============================================
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT,
  target_groups JSONB, -- Array de group_ids
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'scheduled' | 'sent' | 'failed'
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ÍNDICES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_account_id ON users(account_id);
CREATE INDEX IF NOT EXISTS idx_instances_account_id ON instances(account_id);
CREATE INDEX IF NOT EXISTS idx_instances_name ON instances(name);
CREATE INDEX IF NOT EXISTS idx_contacts_account_id ON contacts(account_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_conversations_instance_id ON conversations(instance_id);
CREATE INDEX IF NOT EXISTS idx_conversations_contact_id ON conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_assigned_to ON conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_products_account_id ON products(account_id);
CREATE INDEX IF NOT EXISTS idx_groups_instance_id ON groups(instance_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_instance_id ON campaigns(instance_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Política: Usuários só podem ver sua própria conta
CREATE POLICY "Users can only see their own account"
  ON accounts FOR SELECT
  USING (id IN (
    SELECT account_id FROM users WHERE id = auth.uid()
  ));

-- Política: Usuários só podem ver usuários da mesma conta
CREATE POLICY "Users can only see users from same account"
  ON users FOR SELECT
  USING (account_id IN (
    SELECT account_id FROM users WHERE id = auth.uid()
  ));

-- Política: Usuários só podem ver instâncias da sua conta
CREATE POLICY "Users can only see instances from their account"
  ON instances FOR SELECT
  USING (account_id IN (
    SELECT account_id FROM users WHERE id = auth.uid()
  ));

-- Política: Usuários só podem ver contatos da sua conta
CREATE POLICY "Users can only see contacts from their account"
  ON contacts FOR SELECT
  USING (account_id IN (
    SELECT account_id FROM users WHERE id = auth.uid()
  ));

-- Política: Usuários só podem ver conversas das instâncias da sua conta
CREATE POLICY "Users can only see conversations from their account"
  ON conversations FOR SELECT
  USING (instance_id IN (
    SELECT i.id FROM instances i
    INNER JOIN users u ON i.account_id = u.account_id
    WHERE u.id = auth.uid()
  ));

-- Política: Usuários só podem ver mensagens das conversas da sua conta
CREATE POLICY "Users can only see messages from their account"
  ON messages FOR SELECT
  USING (conversation_id IN (
    SELECT c.id FROM conversations c
    INNER JOIN instances i ON c.instance_id = i.id
    INNER JOIN users u ON i.account_id = u.account_id
    WHERE u.id = auth.uid()
  ));

-- Política: Usuários só podem ver produtos da sua conta
CREATE POLICY "Users can only see products from their account"
  ON products FOR SELECT
  USING (account_id IN (
    SELECT account_id FROM users WHERE id = auth.uid()
  ));

-- Política: Usuários só podem ver grupos das instâncias da sua conta
CREATE POLICY "Users can only see groups from their account"
  ON groups FOR SELECT
  USING (instance_id IN (
    SELECT i.id FROM instances i
    INNER JOIN users u ON i.account_id = u.account_id
    WHERE u.id = auth.uid()
  ));

-- Política: Usuários só podem ver campanhas das instâncias da sua conta
CREATE POLICY "Users can only see campaigns from their account"
  ON campaigns FOR SELECT
  USING (instance_id IN (
    SELECT i.id FROM instances i
    INNER JOIN users u ON i.account_id = u.account_id
    WHERE u.id = auth.uid()
  ));

-- ============================================
-- FUNÇÕES ÚTEIS
-- ============================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_instances_updated_at BEFORE UPDATE ON instances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STORAGE BUCKET (para imagens de produtos)
-- ============================================
-- Execute no Storage do Supabase:
-- 1. Criar bucket chamado "products"
-- 2. Configurar como público (se necessário)
-- 3. Configurar políticas de acesso

-- Política de Storage: Usuários podem fazer upload de imagens
-- CREATE POLICY "Users can upload product images"
--   ON storage.objects FOR INSERT
--   WITH CHECK (
--     bucket_id = 'products' AND
--     auth.uid() IS NOT NULL
--   );

-- Política de Storage: Usuários podem ver imagens de produtos
-- CREATE POLICY "Users can view product images"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'products');

