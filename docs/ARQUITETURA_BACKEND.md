# 🏗️ Arquitetura Backend - WhatsApp SaaS

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura Atual](#arquitetura-atual)
3. [Arquitetura Proposta](#arquitetura-proposta)
4. [Integração com Evolution API](#integração-com-evolution-api)
5. [Estrutura de APIs](#estrutura-de-apis)
6. [Fluxo de Dados](#fluxo-de-dados)
7. [Banco de Dados](#banco-de-dados)
8. [Autenticação e Segurança](#autenticação-e-segurança)
9. [Estrutura do Projeto Backend](#estrutura-do-projeto-backend)
10. [Checklist de Implementação](#checklist-de-implementação)

---

## 🎯 Visão Geral

Este documento descreve a arquitetura completa do backend para o WhatsApp SaaS, incluindo a integração com a Evolution API, Next.js (frontend + API routes), e Supabase.

### Stack Tecnológica

- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes (serverless) + Backend dedicado (opcional)
- **Evolution API**: Docker container para comunicação com WhatsApp
- **Banco de Dados**: Supabase (PostgreSQL)
- **Autenticação**: Supabase Auth
- **IA**: Groq AI (para processamento de mensagens)
- **Hospedagem**: 
  - Frontend: Vercel
  - Evolution API: Render.com ou servidor dedicado
  - Supabase: Cloud

---

## 🏛️ Arquitetura Atual

### Componentes Existentes

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                        │
│  - Dashboard, Conversations, Campaigns, Groups, Settings     │
│  - Autenticação (mockada)                                    │
│  - UI completa e funcional                                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/HTTPS
                            │
┌─────────────────────────────────────────────────────────────┐
│              API ROUTES (Next.js Serverless)                 │
│  - /api/instance/connect                                    │
│  - /api/instance/disconnect                                 │
│  - /api/instance/status                                     │
│  - /api/webhook (recebe eventos da Evolution API)          │
│  - /api/products/upload-image                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/HTTPS
                            │
┌─────────────────────────────────────────────────────────────┐
│                  EVOLUTION API (Docker)                      │
│  - Gerencia conexões WhatsApp                                │
│  - Envia/recebe mensagens                                    │
│  - Gerencia instâncias                                       │
│  - Webhook para eventos                                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Webhook
                            │
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE (PostgreSQL)                      │
│  - Usuários e autenticação                                   │
│  - Instâncias WhatsApp                                       │
│  - Conversas e mensagens                                     │
│  - Produtos                                                  │
│  - Campanhas                                                 │
│  - Grupos                                                    │
└─────────────────────────────────────────────────────────────┘
```

### Fluxo Atual (Mockado)

1. **Frontend** → Chama API Routes do Next.js
2. **API Routes** → Chamam Evolution API (ou mock)
3. **Evolution API** → Envia webhook para `/api/webhook`
4. **Webhook** → Processa mensagem com Groq AI
5. **Webhook** → Salva no Supabase (mockado atualmente)

---

## 🚀 Arquitetura Proposta

### Opção 1: Arquitetura Serverless (Atual - Recomendada para MVP)

Mantém tudo no Next.js, ideal para começar rápido e com baixo custo.

```
Frontend (Next.js) → API Routes (Next.js) → Evolution API
                                          ↓
                                    Supabase
```

**Vantagens:**
- ✅ Simples de implementar
- ✅ Baixo custo inicial
- ✅ Escalável automaticamente
- ✅ Tudo em um único projeto

**Desvantagens:**
- ⚠️ Limites de timeout (10s na Vercel Hobby)
- ⚠️ Processamento de IA pode ser lento

### Opção 2: Arquitetura Híbrida (Recomendada para Produção)

Separa backend dedicado para processamento pesado (IA, webhooks).

```
Frontend (Next.js) → Backend Dedicado → Evolution API
                    ↓                    ↓
                Supabase            Webhook → Backend
```

**Vantagens:**
- ✅ Sem limites de timeout
- ✅ Melhor performance
- ✅ Processamento assíncrono
- ✅ Escalabilidade independente

**Desvantagens:**
- ⚠️ Mais complexo
- ⚠️ Mais custos (servidor dedicado)

---

## 🔌 Integração com Evolution API

### Configuração da Evolution API

A Evolution API deve ser configurada para enviar webhooks para o Next.js:

```yaml
# docker-compose.yml (Evolution API)
services:
  evolution-api:
    environment:
      WEBHOOK_URL: https://seu-dominio.vercel.app/api/webhook
      WEBHOOK_EVENTS: messages.upsert,connection.update,qrcode.update
      API_KEY: sua-chave-secreta
```

### Eventos Recebidos

O webhook `/api/webhook` recebe os seguintes eventos:

#### 1. `messages.upsert` - Nova Mensagem Recebida

```json
{
  "event": "messages.upsert",
  "data": {
    "instanceName": "instance-123",
    "messages": [
      {
        "key": {
          "remoteJid": "5511999999999@s.whatsapp.net",
          "fromMe": false,
          "id": "msg-id"
        },
        "message": {
          "conversation": "Olá, preciso de ajuda"
        },
        "pushName": "João Silva"
      }
    ]
  }
}
```

#### 2. `connection.update` - Status da Conexão

```json
{
  "event": "connection.update",
  "data": {
    "instanceName": "instance-123",
    "state": "open" | "close" | "connecting"
  }
}
```

#### 3. `qrcode.update` - QR Code Atualizado

```json
{
  "event": "qrcode.update",
  "data": {
    "instanceName": "instance-123",
    "qrcode": "base64-encoded-qr-code"
  }
}
```

### Endpoints da Evolution API Utilizados

O projeto já possui um cliente Evolution API em `lib/evolution-api.ts`:

```typescript
// Principais métodos utilizados:
- createInstance(instanceName)
- connectInstance(instanceName) // Retorna QR Code
- getInstanceStatus(instanceName)
- sendTextMessage(instanceName, payload)
- sendMedia(instanceName, number, mediaUrl, caption)
- fetchGroups(instanceName)
- sendGroupMessage(instanceName, payload)
- logoutInstance(instanceName)
- deleteInstance(instanceName)
```

---

## 📡 Estrutura de APIs

### APIs do Next.js (Frontend → Backend)

#### 1. Instâncias WhatsApp

```
POST   /api/instance/connect
  Body: { instanceName: string }
  Response: { success: boolean, qrCode?: string }

DELETE /api/instance/disconnect
  Body: { instanceName: string }
  Response: { success: boolean }

GET    /api/instance/status
  Query: { instanceName: string }
  Response: { status: 'connected' | 'disconnected' | 'connecting' }
```

#### 2. Webhook (Evolution API → Next.js)

```
POST   /api/webhook
  Body: { event: string, data: any }
  Response: { success: boolean }
```

#### 3. Conversas

```
GET    /api/conversations
  Query: { instanceId?: string, status?: string }
  Response: Conversation[]

GET    /api/conversations/:id
  Response: Conversation

POST   /api/conversations/:id/messages
  Body: { text: string }
  Response: { success: boolean }

PUT    /api/conversations/:id/takeover
  Response: { success: boolean }

PUT    /api/conversations/:id/resolve
  Response: { success: boolean }
```

#### 4. Produtos

```
GET    /api/products
  Response: Product[]

POST   /api/products
  Body: { name, description, price, imageUrl }
  Response: Product

PUT    /api/products/:id
  Body: { name, description, price, imageUrl }
  Response: Product

DELETE /api/products/:id
  Response: { success: boolean }

POST   /api/products/upload-image
  Body: FormData (file)
  Response: { url: string }
```

#### 5. Campanhas

```
GET    /api/campaigns
  Response: Campaign[]

POST   /api/campaigns
  Body: { name, message, targetGroups, scheduledFor? }
  Response: Campaign

PUT    /api/campaigns/:id
  Body: { status, ... }
  Response: Campaign

DELETE /api/campaigns/:id
  Response: { success: boolean }
```

#### 6. Grupos

```
GET    /api/groups
  Response: WhatsAppGroup[]

POST   /api/groups
  Body: { groupName, participants }
  Response: WhatsAppGroup

PUT    /api/groups/:id
  Body: { name, description, autoSubscribe, keywords }
  Response: WhatsAppGroup
```

### APIs da Evolution API (Backend → Evolution API)

Todas as chamadas são feitas via HTTP para o servidor Evolution API:

```
Base URL: process.env.NEXT_PUBLIC_EVOLUTION_API_URL
Headers: {
  'Content-Type': 'application/json',
  'apikey': process.env.EVOLUTION_API_KEY
}
```

---

## 🔄 Fluxo de Dados

### 1. Fluxo de Conexão WhatsApp

```
1. Usuário clica em "Conectar WhatsApp" no Dashboard
   ↓
2. Frontend chama POST /api/instance/connect
   ↓
3. API Route chama evolutionAPI.createInstance()
   ↓
4. Evolution API cria instância e retorna QR Code
   ↓
5. Frontend exibe QR Code
   ↓
6. Usuário escaneia QR Code no WhatsApp
   ↓
7. Evolution API envia webhook connection.update
   ↓
8. Webhook atualiza status no Supabase
   ↓
9. Frontend atualiza status (polling ou WebSocket)
```

### 2. Fluxo de Mensagem Recebida

```
1. Cliente envia mensagem no WhatsApp
   ↓
2. Evolution API recebe mensagem
   ↓
3. Evolution API envia webhook messages.upsert para /api/webhook
   ↓
4. Webhook processa mensagem:
   a. Busca ou cria conversa no Supabase
   b. Salva mensagem recebida
   c. Verifica se conversa está com atendente humano
   d. Se não, processa com Groq AI:
      - Analisa intenção
      - Gera resposta
      - Verifica se deve transferir
   e. Envia resposta via Evolution API
   f. Salva mensagem enviada no Supabase
   ↓
5. Frontend atualiza conversas (polling ou WebSocket)
```

### 3. Fluxo de Mensagem Enviada pelo Atendente

```
1. Atendente digita mensagem no frontend
   ↓
2. Frontend chama POST /api/conversations/:id/messages
   ↓
3. API Route:
   a. Valida permissões
   b. Chama evolutionAPI.sendTextMessage()
   c. Salva mensagem no Supabase
   ↓
4. Evolution API envia mensagem via WhatsApp
   ↓
5. Frontend atualiza UI
```

### 4. Fluxo de Transbordo (Bot → Humano)

```
1. Cliente envia mensagem
   ↓
2. Webhook processa com Groq AI
   ↓
3. IA detecta intenção de compra ou palavra-chave
   ↓
4. Webhook:
   a. Atualiza conversation.status = 'waiting_agent'
   b. Envia mensagem de transferência
   c. Para de processar mensagens dessa conversa
   ↓
5. Atendente assume conversa (PUT /api/conversations/:id/takeover)
   ↓
6. Status muda para 'in_service'
   ↓
7. Próximas mensagens não são processadas pelo bot
```

---

## 🗄️ Banco de Dados

### Estrutura do Supabase

#### Tabelas Principais

```sql
-- Usuários (gerenciado pelo Supabase Auth)
users (
  id UUID PRIMARY KEY,
  email TEXT,
  name TEXT,
  role TEXT, -- 'admin' | 'agent'
  account_id UUID REFERENCES accounts(id)
)

-- Contas (Multi-tenancy)
accounts (
  id UUID PRIMARY KEY,
  name TEXT,
  -- Configurações do negócio
  company_name TEXT,
  business_type TEXT,
  business_description TEXT,
  opening_hours JSONB,
  address TEXT,
  phone TEXT,
  delivery_available BOOLEAN,
  delivery_fee DECIMAL,
  -- Configurações do bot
  welcome_message TEXT,
  default_message TEXT,
  transfer_keywords TEXT[],
  transfer_message TEXT,
  bot_personality TEXT,
  -- Groq AI
  groq_api_key TEXT,
  created_at TIMESTAMPTZ
)

-- Instâncias WhatsApp
instances (
  id UUID PRIMARY KEY,
  account_id UUID REFERENCES accounts(id),
  name TEXT UNIQUE, -- Nome da instância na Evolution API
  status TEXT, -- 'connected' | 'disconnected' | 'connecting'
  phone_number TEXT,
  profile_pic_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Contatos
contacts (
  id UUID PRIMARY KEY,
  account_id UUID REFERENCES accounts(id),
  phone_number TEXT,
  name TEXT,
  profile_pic_url TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ
)

-- Conversas
conversations (
  id UUID PRIMARY KEY,
  instance_id UUID REFERENCES instances(id),
  contact_id UUID REFERENCES contacts(id),
  status TEXT, -- 'bot' | 'waiting_agent' | 'in_service' | 'resolved'
  assigned_to UUID REFERENCES users(id),
  last_message_at TIMESTAMPTZ,
  transferred_at TIMESTAMPTZ,
  transfer_reason TEXT,
  bot_handoff_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Mensagens
messages (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id),
  from_me BOOLEAN,
  body TEXT,
  timestamp TIMESTAMPTZ,
  status TEXT, -- 'sent' | 'delivered' | 'read'
  sent_by TEXT, -- 'bot' | 'agent' | 'customer'
  agent_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ
)

-- Produtos
products (
  id UUID PRIMARY KEY,
  account_id UUID REFERENCES accounts(id),
  name TEXT,
  description TEXT,
  price DECIMAL,
  image_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Grupos
groups (
  id UUID PRIMARY KEY,
  instance_id UUID REFERENCES instances(id),
  group_id TEXT UNIQUE, -- ID do grupo no WhatsApp
  name TEXT,
  description TEXT,
  auto_subscribe BOOLEAN,
  keywords TEXT[],
  welcome_message TEXT,
  created_at TIMESTAMPTZ
)

-- Campanhas
campaigns (
  id UUID PRIMARY KEY,
  instance_id UUID REFERENCES instances(id),
  name TEXT,
  message TEXT,
  media_url TEXT,
  media_type TEXT,
  target_groups JSONB,
  status TEXT, -- 'draft' | 'scheduled' | 'sent' | 'failed'
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ
)
```

### Relacionamentos

```
accounts (1) ──→ (N) users
accounts (1) ──→ (N) instances
accounts (1) ──→ (N) contacts
accounts (1) ──→ (N) products

instances (1) ──→ (N) conversations
instances (1) ──→ (N) groups
instances (1) ──→ (N) campaigns

contacts (1) ──→ (N) conversations

conversations (1) ──→ (N) messages

users (1) ──→ (N) conversations (assigned_to)
users (1) ──→ (N) messages (agent_id)
```

---

## 🔐 Autenticação e Segurança

### Autenticação

1. **Supabase Auth**: Gerenciamento de usuários e sessões
2. **JWT Tokens**: Tokens de acesso para API
3. **RLS (Row Level Security)**: Isolamento de dados por conta

### Segurança

1. **API Key da Evolution API**: Armazenada em variáveis de ambiente
2. **Groq API Key**: Armazenada por conta (tabela `accounts`)
3. **Webhook Validation**: Validar origem dos webhooks
4. **Rate Limiting**: Limitar requisições por instância

### Row Level Security (RLS)

Todas as tabelas devem ter RLS habilitado:

```sql
-- Exemplo: accounts
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own account"
  ON accounts FOR SELECT
  USING (id IN (
    SELECT account_id FROM users WHERE id = auth.uid()
  ));
```

---

## 📁 Estrutura do Projeto Backend

### Opção 1: Backend Dedicado (Node.js/Express ou Python/FastAPI)

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts          # Configuração Supabase
│   │   ├── evolution-api.ts     # Cliente Evolution API
│   │   └── groq.ts              # Cliente Groq AI
│   ├── controllers/
│   │   ├── webhook.controller.ts
│   │   ├── instance.controller.ts
│   │   ├── conversation.controller.ts
│   │   └── campaign.controller.ts
│   ├── services/
│   │   ├── bot.service.ts       # Lógica do bot
│   │   ├── message.service.ts
│   │   ├── conversation.service.ts
│   │   └── groq.service.ts
│   ├── models/
│   │   ├── conversation.model.ts
│   │   ├── message.model.ts
│   │   └── instance.model.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   └── rate-limit.middleware.ts
│   └── routes/
│       ├── webhook.routes.ts
│       ├── instance.routes.ts
│       └── conversation.routes.ts
├── package.json
└── .env
```

### Opção 2: Manter no Next.js (Atual)

A estrutura atual já está organizada:

```
whatsapp-saas/
├── app/
│   └── api/                    # API Routes
│       ├── webhook/
│       ├── instance/
│       ├── conversations/
│       └── products/
├── lib/
│   ├── evolution-api.ts         # Cliente Evolution API
│   ├── supabase.ts             # Cliente Supabase
│   └── services/
│       ├── bot-logic.ts
│       ├── groq-ai.ts
│       ├── products.ts
│       └── business-config.ts
└── types/
    └── index.ts
```

---

## ✅ Checklist de Implementação

### Fase 1: Configuração Inicial

- [ ] Configurar Evolution API (Docker)
- [ ] Configurar variáveis de ambiente
- [ ] Configurar webhook URL na Evolution API
- [ ] Testar conexão com Evolution API

### Fase 2: Integração Supabase

- [ ] Criar tabelas no Supabase
- [ ] Configurar RLS (Row Level Security)
- [ ] Substituir mocks por chamadas reais ao Supabase
- [ ] Implementar autenticação real

### Fase 3: Webhook

- [ ] Implementar validação de webhook
- [ ] Processar eventos `messages.upsert`
- [ ] Processar eventos `connection.update`
- [ ] Processar eventos `qrcode.update`
- [ ] Integrar com Groq AI
- [ ] Salvar mensagens no Supabase

### Fase 4: APIs do Frontend

- [ ] Implementar `/api/instance/connect`
- [ ] Implementar `/api/instance/disconnect`
- [ ] Implementar `/api/instance/status`
- [ ] Implementar `/api/conversations`
- [ ] Implementar `/api/conversations/:id/messages`
- [ ] Implementar `/api/conversations/:id/takeover`
- [ ] Implementar `/api/products`
- [ ] Implementar `/api/campaigns`
- [ ] Implementar `/api/groups`

### Fase 5: Funcionalidades Avançadas

- [ ] Sistema de transbordo (bot → humano)
- [ ] Rate limiting
- [ ] Upload de imagens (produtos)
- [ ] Campanhas em grupos
- [ ] Gerenciamento de grupos com opt-in

### Fase 6: Otimizações

- [ ] WebSocket para atualizações em tempo real
- [ ] Cache de configurações
- [ ] Fila de mensagens (para rate limiting)
- [ ] Logs e monitoramento

---

## 📚 Referências

- [Evolution API Documentation](https://doc.evolution-api.com/)
- [Supabase Documentation](https://supabase.com/docs)
- [Groq AI Documentation](https://console.groq.com/docs)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

---

**Última atualização:** 2024
**Versão:** 1.0

