# 🚀 Guia Rápido - Backend WhatsApp SaaS

## 📋 Para o Desenvolvedor Backend

Este guia fornece um resumo rápido e direto para começar a trabalhar no backend.

---

## 🎯 O Que Precisa Ser Feito

### 1. **Integrar Evolution API com Next.js**
   - Configurar Evolution API (Docker)
   - Conectar webhooks da Evolution API com o Next.js
   - Implementar endpoints para gerenciar instâncias WhatsApp

### 2. **Conectar Supabase**
   - Criar tabelas no Supabase
   - Substituir mocks por chamadas reais ao Supabase
   - Implementar autenticação real

### 3. **Implementar APIs do Frontend**
   - Endpoints para conversas
   - Endpoints para produtos
   - Endpoints para campanhas
   - Endpoints para grupos

---

## 🏗️ Arquitetura Atual

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                        │
│  ✅ Dashboard, Conversations, Campaigns, Groups             │
│  ✅ UI completa e funcional                                   │
│  ⏳ Autenticação mockada (precisa conectar Supabase)          │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/HTTPS
                            │
┌─────────────────────────────────────────────────────────────┐
│              BACKEND (Next.js API Routes)                     │
│  ✅ /api/webhook (lógica do bot implementada)                │
│  ✅ /api/instance/* (implementado)                            │
│  ✅ /api/conversations/* (implementado)                       │
│  ✅ /api/products/* (implementado)                             │
│  ⏳ /api/campaigns/* (precisa implementar)                     │
│  ⏳ /api/groups/* (precisa implementar)                        │
└─────────────────────────────────────────────────────────────┘
         │                              │
         │ HTTP/HTTPS                   │ Webhook
         │                              │
┌────────────────────────┐   ┌─────────────────────────────┐
│   EVOLUTION API        │   │      GROQ AI                │
│   (Docker Container)   │   │   ✅ Integração completa      │
│   ⏳ Precisa configurar│   │   ✅ Rate limiting            │
└────────────────────────┘   └─────────────────────────────┘
         │
         │ Webhook
         │
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE (PostgreSQL)                      │
│  ⏳ Tabelas precisam ser criadas                              │
│  ⏳ RLS precisa ser configurado                               │
│  ⏳ Mocks precisam ser substituídos                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔑 Componentes Principais

### 1. **Evolution API** (Docker)
- Gerencia conexões WhatsApp
- Envia/recebe mensagens
- Gerencia instâncias
- Envia webhooks para o backend

**Status:** ⏳ Precisa configurar

**Arquivo:** `lib/evolution-api.ts` (cliente já implementado)

### 2. **Webhook** (Next.js API Route)
- Recebe eventos da Evolution API
- Processa mensagens com Groq AI
- Gerencia transbordo (bot → humano)

**Status:** ✅ Implementado

**Arquivo:** `app/api/webhook/route.ts`

### 3. **Supabase** (PostgreSQL)
- Usuários e autenticação
- Instâncias WhatsApp
- Conversas e mensagens
- Produtos, campanhas, grupos

**Status:** ⏳ Precisa criar tabelas e conectar

**Arquivo:** `lib/supabase.ts` (cliente já implementado)

### 4. **Groq AI** (Processamento de IA)
- Analisa intenção
- Gera respostas
- Detecta compra

**Status:** ✅ Implementado

**Arquivo:** `lib/services/groq-ai.ts`

---

## 🔄 Fluxos Principais

### 1. Conectar WhatsApp

```
1. Usuário clica "Conectar WhatsApp"
   ↓
2. Frontend → POST /api/instance/connect
   ↓
3. Backend → Evolution API (createInstance)
   ↓
4. Evolution API → Retorna QR Code
   ↓
5. Backend → Salva no Supabase
   ↓
6. Frontend → Exibe QR Code
   ↓
7. Usuário escaneia → Evolution API conecta
   ↓
8. Evolution API → Webhook (connection.update)
   ↓
9. Backend → Atualiza status no Supabase
```

**Status:** ✅ Implementado

### 2. Mensagem Recebida

```
1. Cliente envia mensagem no WhatsApp
   ↓
2. Evolution API recebe
   ↓
3. Evolution API → Webhook (messages.upsert) → /api/webhook
   ↓
4. Backend processa:
   a. Busca/cria conversa no Supabase ✅
   b. Salva mensagem recebida ✅
   c. Verifica se conversa está com atendente ✅
   d. Se não, processa com Groq AI ✅
   e. Envia resposta via Evolution API ✅
   f. Salva mensagem enviada no Supabase ✅
```

**Status:** ✅ Implementado

### 3. Atendente Envia Mensagem

```
1. Atendente digita mensagem no frontend
   ↓
2. Frontend → POST /api/conversations/{id}/messages
   ↓
3. Backend:
   a. Valida autenticação ✅
   b. Busca conversa e instância ✅
   c. Chama Evolution API (sendTextMessage) ✅
   d. Salva mensagem no Supabase ✅
```

**Status:** ✅ Implementado

### 4. Transbordo (Bot → Humano)

```
1. Cliente envia mensagem
   ↓
2. Webhook processa com Groq AI ✅
   ↓
3. IA detecta intenção de compra ✅
   ↓
4. Webhook:
   a. Atualiza conversation.status = 'waiting_agent' ✅
   b. Envia mensagem de transferência ✅
   c. Para de processar mensagens dessa conversa ✅
   ↓
5. Atendente assume conversa
   ↓
6. Status muda para 'in_service' ✅
```

**Status:** ✅ Implementado

---

## 📡 Endpoints Implementados

### 1. Instâncias WhatsApp

- ✅ `POST /api/instance/connect`
- ✅ `DELETE /api/instance/disconnect`
- ✅ `GET /api/instance/status`

### 2. Conversas

- ✅ `GET /api/conversations`
- ✅ `GET /api/conversations/:id`
- ✅ `POST /api/conversations/:id/messages`
- ✅ `PUT /api/conversations/:id/takeover`
- ✅ `PUT /api/conversations/:id/resolve`

### 3. Produtos

- ✅ `GET /api/products`
- ✅ `POST /api/products`
- ✅ `PUT /api/products/:id`
- ✅ `DELETE /api/products/:id`
- ✅ `POST /api/products/upload-image`

### 4. Campanhas

- ⏳ `GET /api/campaigns` (precisa implementar)
- ⏳ `POST /api/campaigns` (precisa implementar)
- ⏳ `PUT /api/campaigns/:id` (precisa implementar)
- ⏳ `DELETE /api/campaigns/:id` (precisa implementar)

### 5. Grupos

- ⏳ `GET /api/groups` (precisa implementar)
- ⏳ `POST /api/groups` (precisa implementar)
- ⏳ `PUT /api/groups/:id` (precisa implementar)

---

## 🗄️ Banco de Dados (Supabase)

### Tabelas que Precisam Ser Criadas

Ver `SCRIPTS_SUPABASE.sql` na raiz do projeto para scripts SQL completos.

**Tabelas principais:**
- `accounts` - Contas (multi-tenancy)
- `users` - Usuários (Supabase Auth)
- `instances` - Instâncias WhatsApp
- `contacts` - Contatos
- `conversations` - Conversas
- `messages` - Mensagens
- `products` - Produtos
- `groups` - Grupos
- `campaigns` - Campanhas

### Relacionamentos

```
accounts (1) ──→ (N) instances
accounts (1) ──→ (N) contacts
accounts (1) ──→ (N) products

instances (1) ──→ (N) conversations
instances (1) ──→ (N) groups
instances (1) ──→ (N) campaigns

contacts (1) ──→ (N) conversations
conversations (1) ──→ (N) messages
```

---

## 🔐 Autenticação e Segurança

### Autenticação

- ✅ **Supabase Auth**: Implementado
- ✅ **JWT Tokens**: Implementado
- ⏳ **RLS (Row Level Security)**: Precisa configurar

### Segurança

- ⏳ **API Key da Evolution API**: Precisa configurar
- ⏳ **Groq API Key**: Precisa armazenar por conta
- ⏳ **Webhook Validation**: Precisa validar origem
- ✅ **Rate Limiting**: Já implementado

---

## 📦 Stack Tecnológica

- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes (serverless)
- **Evolution API**: Docker container
- **Banco de Dados**: Supabase (PostgreSQL)
- **Autenticação**: Supabase Auth
- **IA**: Groq AI

---

## ✅ Checklist de Implementação

### Fase 1: Configuração Inicial

- [ ] Configurar Evolution API (Docker)
  - [ ] Criar `docker-compose.yml`
  - [ ] Configurar variáveis de ambiente
  - [ ] Configurar webhook URL
  - [ ] Testar conexão

- [ ] Configurar Variáveis de Ambiente
  ```env
  NEXT_PUBLIC_EVOLUTION_API_URL=http://localhost:8080
  EVOLUTION_API_KEY=sua-chave-secreta
  NEXT_PUBLIC_SUPABASE_URL=sua-url
  NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave
  GROQ_API_KEY=sua-chave-groq
  ```

### Fase 2: Integração Supabase

- [ ] Criar Tabelas no Supabase
  - [ ] Executar scripts SQL (ver `SCRIPTS_SUPABASE.sql`)
  - [ ] Configurar RLS (Row Level Security)
  - [ ] Testar queries

- [ ] Substituir Mocks
  - [ ] Substituir `mockDataService` por chamadas reais ao Supabase
  - [ ] Substituir `businessConfigService` por chamadas reais
  - [ ] Substituir `productsService` por chamadas reais
  - [ ] Conectar autenticação real

### Fase 3: Webhook

- [ ] Validação de Webhook
  - [ ] Validar origem dos webhooks
  - [ ] Verificar API key

- [ ] Integração com Supabase
  - [ ] Salvar mensagens no Supabase
  - [ ] Atualizar status de conversas
  - [ ] Buscar configurações do negócio

### Fase 4: APIs do Frontend

- [x] Instâncias ✅
- [x] Conversas ✅
- [x] Produtos ✅
- [ ] Campanhas
- [ ] Grupos

### Fase 5: Testes

- [ ] Testar Conexão WhatsApp
  - [ ] Criar instância
  - [ ] Escanear QR Code
  - [ ] Verificar status

- [ ] Testar Mensagens
  - [ ] Enviar mensagem do WhatsApp
  - [ ] Verificar webhook
  - [ ] Verificar resposta do bot

- [ ] Testar Transbordo
  - [ ] Enviar palavra-chave
  - [ ] Verificar transferência
  - [ ] Testar atendimento humano

---

## 📚 Documentação Completa

Para mais detalhes, consulte:

- **`docs/ARQUITETURA_BACKEND.md`** - Arquitetura completa
- **`docs/ESPECIFICACAO_TECNICA_BACKEND.md`** - Especificação técnica detalhada
- **`docs/RESUMO_BACKEND.md`** - Resumo executivo
- **`SCRIPTS_SUPABASE.sql`** - Scripts SQL e integração Supabase

---

## 🚀 Começando Agora

### 1. Configurar Evolution API

```bash
# Criar docker-compose.yml
services:
  evolution-api:
    image: atendai/evolution-api:latest
    ports:
      - "8080:8080"
    environment:
      WEBHOOK_URL: http://localhost:3000/api/webhook
      WEBHOOK_EVENTS: messages.upsert,connection.update,qrcode.update
      API_KEY: sua-chave-secreta
```

### 2. Criar Tabelas no Supabase

Ver `SCRIPTS_SUPABASE.sql` na raiz do projeto para scripts SQL.

### 3. Implementar Primeira API

Começar com `/api/instance/connect` (já implementado).

### 4. Testar Integração

Testar conexão com Evolution API e webhook.

---

**Última atualização:** 2024
**Versão:** 1.0

