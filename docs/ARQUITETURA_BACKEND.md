# 🏗️ Arquitetura Backend - WhatsApp SaaS

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura Atual](#arquitetura-atual)
3. [Isolamento de Infraestrutura](#isolamento-de-infraestrutura)
4. [Integração com Evolution API](#integração-com-evolution-api)
5. [Banco de Dados](#banco-de-dados)
6. [Fluxo de Dados](#fluxo-de-dados)
7. [Estrutura de APIs](#estrutura-de-apis)

---

## 🎯 Visão Geral

Este documento descreve a arquitetura do backend para o WhatsApp SaaS, incluindo a integração com a Evolution API (com SQLite isolado) e o Supabase (exclusivo do Motor).

### Stack Tecnológica

- **Frontend**: Next.js (Netlify)
- **Backend (Motor)**: Next.js API Routes (Render)
- **Evolution API**: Docker container (Render) com SQLite local
- **Banco de Dados Motor**: Supabase (PostgreSQL) - uso exclusivo do Motor
- **Banco de Dados Evolution**: SQLite local (isolado no container)
- **Autenticação**: Cookies + Supabase Auth
- **IA**: Groq AI (para processamento de mensagens)

---

## 🏛️ Arquitetura Atual

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js/Netlify)                │
│  - Dashboard, Conversations, Campaigns, Settings            │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/HTTPS (API REST)
                            │
┌─────────────────────────────────────────────────────────────┐
│              MOTOR - API Routes (Next.js/Render)             │
│  - /api/instance/connect                                    │
│  - /api/instance/disconnect                                 │
│  - /api/instance/status                                     │
│  - /api/webhook (recebe eventos da Evolution API)          │
│  - /api/conversations                                       │
│  - /api/products                                            │
└─────────────────────────────────────────────────────────────┘
           │                                    │
           │ HTTP REST                          │ Webhook (HTTP POST)
           │                                    │
┌─────────────────────────────────┐  ┌──────────────────────────────┐
│  SUPABASE (PostgreSQL)          │  │  EVOLUTION API (Docker)      │
│  - Exclusivo do Motor           │  │  - SQLite Local (isolado)    │
│                                 │  │  - Gerencia conexões         │
│  Tabelas:                       │  │  - Envia/recebe mensagens    │
│  - accounts                     │  │  - Webhook para eventos      │
│  - instances                    │  │                              │
│  - contacts                     │  │  ⚠️ Sem acesso ao Supabase   │
│  - conversations                │  │  ⚠️ Dados efêmeros no SQLite │
│  - messages                     │  │                              │
│  - products                     │  └──────────────────────────────┘
│  - groups                       │            │
│  - campaigns                    │            │ SQLite (isolado)
│  - users                        │            │
└─────────────────────────────────┘            │
                                      ┌────────┴────────┐
                                      │  SQLite Local   │
                                      │  (dentro do     │
                                      │   container)    │
                                      └─────────────────┘
```

---

## 🔒 Isolamento de Infraestrutura

### ⚠️ IMPORTANTE: Separação Total de Bancos

A Evolution API **NÃO compartilha mais** o banco Supabase com o Motor. 

#### Evolution API (SQLite Local)
- ✅ Banco de dados **SQLite** local dentro do container Docker
- ✅ Dados **efêmeros** (perdidos ao recriar container)
- ✅ Armazena apenas:
  - Sessões WhatsApp (autenticação Baileys)
  - Cache temporário de conexões
  - Configurações internas da Evolution

#### Motor (Supabase PostgreSQL)
- ✅ Banco de dados **Supabase** exclusivo do Motor
- ✅ Dados **persistentes** (histórico completo)
- ✅ Armazena:
  - Instâncias WhatsApp (metadados)
  - Contatos
  - Conversas e mensagens
  - Produtos e campanhas
  - Usuários e contas
  - Configurações de negócio

### 🚫 Garantias de Isolamento

1. **Sem acesso direto ao banco da Evolution**
   - Motor **NUNCA** acessa SQLite da Evolution
   - Toda comunicação via **HTTP REST** (`lib/evolution-api.ts`)

2. **Sem acesso direto ao Supabase pela Evolution**
   - Evolution **NUNCA** acessa Supabase
   - Evolution usa apenas SQLite local

3. **Persistência via Webhook**
   - Motor recebe eventos via webhook
   - Motor salva dados importantes no Supabase
   - Evolution mantém apenas dados temporários no SQLite

---

## 🔌 Integração com Evolution API

### Comunicação 100% via HTTP REST

O Motor **nunca** acessa diretamente o banco da Evolution. Toda interação é via API REST:

```typescript
// lib/evolution-api.ts
- createInstance(instanceName)
- connectInstance(instanceName)
- getInstanceStatus(instanceName)
- sendTextMessage(instanceName, payload)
- deleteInstance(instanceName)
// ... todos os métodos são HTTP REST
```

### Configuração da Evolution API (Render)

```env
# Database - SQLite local (isolado)
DATABASE_ENABLED=true
DATABASE_PROVIDER=sqlite
DATABASE_CONNECTION_URI=file:./database.sqlite

# Webhook para o Motor
WEBHOOK_URL=https://whatsapp-evolution-api-fa3y.onrender.com/api/webhook
WEBHOOK_EVENTS=messages.upsert,connection.update,qrcode.update

# API Key
AUTHENTICATION_API_KEY=your-api-key
```

### Eventos do Webhook

O Motor recebe eventos da Evolution via webhook (`/api/webhook`):

1. **`messages.upsert`**: Nova mensagem recebida
   - Motor salva no Supabase
   - Motor processa com IA (se necessário)

2. **`connection.update`**: Status da conexão mudou
   - Motor atualiza `instances.status` no Supabase

3. **`qrcode.update`**: QR Code atualizado
   - Motor atualiza `instances.qr_code` no Supabase

---

## 🗄️ Banco de Dados

### Tabelas do Motor (Supabase)

#### `accounts`
Contas de negócio (multi-tenancy).

#### `instances`
Metadados das instâncias WhatsApp:
- `name`: Nome da instância na Evolution API
- `status`: `connected` | `disconnected` | `connecting`
- `phone_number`: Número do WhatsApp (atualizado via webhook)
- `qr_code`: QR Code para conexão (atualizado via webhook)

⚠️ **Importante**: O Motor não acessa sessões ou autenticação da Evolution. Apenas metadados.

#### `contacts`
Contatos do WhatsApp salvos pelo Motor.

#### `conversations`
Conversas entre contatos e instâncias.

#### `messages`
Histórico de mensagens (salvas via webhook).

#### `products`
Produtos do catálogo.

#### `groups`
Grupos do WhatsApp.

#### `campaigns`
Campanhas de mensagens.

#### `users`
Usuários do sistema.

---

## 🔄 Fluxo de Dados

### 1. Conexão WhatsApp

```
1. Frontend → POST /api/instance/connect
   ↓
2. Motor → evolutionAPI.createInstance() (HTTP REST)
   ↓
3. Evolution API → Cria sessão no SQLite local
   ↓
4. Evolution API → Retorna QR Code para o Motor
   ↓
5. Motor → Salva instância no Supabase (status: 'connecting')
   ↓
6. Frontend → Exibe QR Code
   ↓
7. Usuário escaneia QR Code
   ↓
8. Evolution API → Webhook connection.update (state: 'open')
   ↓
9. Motor → Atualiza instances.status = 'connected' no Supabase
```

### 2. Mensagem Recebida

```
1. Cliente envia mensagem no WhatsApp
   ↓
2. Evolution API → Recebe e processa
   ↓
3. Evolution API → Webhook messages.upsert
   ↓
4. Motor (/api/webhook) → Recebe evento
   ↓
5. Motor → Busca/cria conversation no Supabase
   ↓
6. Motor → Salva message no Supabase
   ↓
7. Motor → Processa com IA (se necessário)
   ↓
8. Motor → Envia resposta via evolutionAPI.sendTextMessage()
   ↓
9. Motor → Salva message enviada no Supabase
```

### 3. Persistência de Dados

**Dados salvos no Supabase (persistentes)**:
- ✅ Todas as mensagens (recebidas e enviadas)
- ✅ Todas as conversas
- ✅ Contatos e metadados
- ✅ Status das instâncias

**Dados no SQLite da Evolution (efêmeros)**:
- ⚠️ Sessões WhatsApp (autenticação)
- ⚠️ Cache temporário

**⚠️ Importante**: Se o container da Evolution for recriado, o SQLite será perdido. O Motor pode recriar a instância via API REST, mas o usuário precisará escanear o QR Code novamente.

---

## 📡 Estrutura de APIs

### APIs do Motor (Frontend → Motor)

#### Instâncias
```
POST   /api/instance/connect
  Body: { instanceName?: string }
  Response: { status: 'initializing', instanceId, instanceName }

GET    /api/instance/status?instanceName=...
  Response: { status, qrCode, phoneNumber }

DELETE /api/instance/disconnect
  Response: { success: boolean }
```

#### Conversas
```
GET    /api/conversations
  Response: Conversation[]

GET    /api/conversations/:id
  Response: Conversation

POST   /api/conversations/:id/messages
  Body: { text: string }
  Response: { success: boolean }
```

#### Webhook (Evolution API → Motor)
```
POST   /api/webhook
  Body: { event: string, data: any }
  Response: { success: boolean }
```

### APIs da Evolution API (Motor → Evolution)

Todas as chamadas são HTTP REST:

```
Base URL: process.env.NEXT_PUBLIC_EVOLUTION_API_URL
Headers: {
  'Content-Type': 'application/json',
  'apikey': process.env.EVOLUTION_API_KEY
}
```

---

## ✅ Checklist de Isolamento

### Verificação de Segurança

- [x] Motor não acessa SQLite da Evolution
- [x] Evolution não acessa Supabase
- [x] Toda comunicação via HTTP REST
- [x] Webhook salva dados importantes no Supabase
- [x] Schema do Supabase contém apenas tabelas do Motor

### Tabelas do Supabase

Todas as tabelas são exclusivas do Motor:
- [x] `accounts` - Contas de negócio
- [x] `instances` - Metadados das instâncias (não sessões)
- [x] `contacts` - Contatos
- [x] `conversations` - Conversas
- [x] `messages` - Mensagens
- [x] `products` - Produtos
- [x] `groups` - Grupos
- [x] `campaigns` - Campanhas
- [x] `users` - Usuários

### Comunicação com Evolution

- [x] Cliente HTTP em `lib/evolution-api.ts`
- [x] Todos os métodos são HTTP REST
- [x] Nenhum acesso direto ao banco
- [x] Webhook recebe eventos e salva no Supabase

---

## 📚 Referências

- [Evolution API Documentation](https://doc.evolution-api.com/)
- [Supabase Documentation](https://supabase.com/docs)

---

**Última atualização:** 2025-01-22  
**Versão:** 2.0 (SQLite Isolado)

