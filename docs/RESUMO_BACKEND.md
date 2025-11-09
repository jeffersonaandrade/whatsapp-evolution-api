# 📋 Resumo Backend - WhatsApp SaaS

## 🎯 Objetivo

Este documento fornece um resumo executivo da arquitetura backend para integração do frontend Next.js com a Evolution API.

---

## 🏗️ Arquitetura Simplificada

```
Frontend (Next.js) 
    ↓
Backend (Next.js API Routes)
    ↓
Evolution API (Docker) ← Webhook → Backend
    ↓
Supabase (PostgreSQL)
```

---

## 🔑 Componentes Principais

### 1. **Frontend (Next.js)**
- Interface do usuário completa
- Autenticação via Supabase Auth
- Telas: Dashboard, Conversas, Campanhas, Grupos, Configurações

### 2. **Backend (Next.js API Routes)**
- `/api/instance/*` - Gerenciar instâncias WhatsApp
- `/api/webhook` - Receber eventos da Evolution API
- `/api/conversations/*` - Gerenciar conversas
- `/api/products/*` - Gerenciar produtos
- `/api/campaigns/*` - Gerenciar campanhas
- `/api/groups/*` - Gerenciar grupos

### 3. **Evolution API (Docker)**
- Gerencia conexões WhatsApp
- Envia/recebe mensagens
- Gerencia instâncias
- Envia webhooks para o backend

### 4. **Supabase (PostgreSQL)**
- Usuários e autenticação
- Instâncias WhatsApp
- Conversas e mensagens
- Produtos
- Campanhas
- Grupos

### 5. **Groq AI**
- Processamento de mensagens
- Análise de intenção
- Geração de respostas

---

## 🔄 Fluxos Principais

### 1. Conectar WhatsApp

```
Usuário → Frontend → POST /api/instance/connect
    ↓
Backend → Evolution API (createInstance)
    ↓
Evolution API → Retorna QR Code
    ↓
Backend → Salva no Supabase
    ↓
Frontend → Exibe QR Code
    ↓
Usuário escaneia → Evolution API conecta
    ↓
Evolution API → Webhook (connection.update)
    ↓
Backend → Atualiza status no Supabase
```

### 2. Mensagem Recebida

```
Cliente envia mensagem no WhatsApp
    ↓
Evolution API recebe
    ↓
Evolution API → Webhook (messages.upsert) → /api/webhook
    ↓
Backend processa:
  - Busca/cria conversa no Supabase
  - Salva mensagem recebida
  - Verifica se conversa está com atendente
  - Se não, processa com Groq AI:
    * Analisa intenção
    * Gera resposta
    * Verifica se deve transferir
  - Envia resposta via Evolution API
  - Salva mensagem enviada no Supabase
```

### 3. Atendente Envia Mensagem

```
Atendente digita mensagem no frontend
    ↓
Frontend → POST /api/conversations/{id}/messages
    ↓
Backend:
  - Valida autenticação
  - Busca conversa e instância
  - Chama Evolution API (sendTextMessage)
  - Salva mensagem no Supabase
    ↓
Evolution API envia mensagem via WhatsApp
```

### 4. Transbordo (Bot → Humano)

```
Cliente envia mensagem
    ↓
Webhook processa com Groq AI
    ↓
IA detecta intenção de compra ou palavra-chave
    ↓
Webhook:
  - Atualiza conversation.status = 'waiting_agent'
  - Envia mensagem de transferência
  - Para de processar mensagens dessa conversa
    ↓
Atendente assume conversa
    ↓
Status muda para 'in_service'
    ↓
Próximas mensagens não são processadas pelo bot
```

---

## 📡 Endpoints Principais

### Evolution API → Backend (Webhook)

```
POST /api/webhook
Body: {
  "event": "messages.upsert" | "connection.update" | "qrcode.update",
  "data": { ... }
}
```

### Frontend → Backend

```
POST   /api/instance/connect
DELETE /api/instance/disconnect
GET    /api/instance/status

GET    /api/conversations
GET    /api/conversations/:id
POST   /api/conversations/:id/messages
PUT    /api/conversations/:id/takeover
PUT    /api/conversations/:id/resolve

GET    /api/products
POST   /api/products
POST   /api/products/upload-image

GET    /api/campaigns
POST   /api/campaigns

GET    /api/groups
POST   /api/groups
```

### Backend → Evolution API

```
POST   /instance/create
GET    /instance/connect/{instanceName}
GET    /instance/connectionState/{instanceName}
POST   /message/sendText/{instanceName}
POST   /message/sendMedia/{instanceName}
GET    /group/fetchAllGroups/{instanceName}
DELETE /instance/logout/{instanceName}
DELETE /instance/delete/{instanceName}
```

---

## 🗄️ Estrutura do Banco de Dados

### Tabelas Principais

- **accounts** - Contas (multi-tenancy)
- **users** - Usuários (Supabase Auth)
- **instances** - Instâncias WhatsApp
- **contacts** - Contatos
- **conversations** - Conversas
- **messages** - Mensagens
- **products** - Produtos
- **groups** - Grupos
- **campaigns** - Campanhas

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

- **Supabase Auth**: Gerenciamento de usuários e sessões
- **JWT Tokens**: Tokens de acesso para API
- **RLS (Row Level Security)**: Isolamento de dados por conta

### Segurança

- **API Key da Evolution API**: Armazenada em variáveis de ambiente
- **Groq API Key**: Armazenada por conta (tabela `accounts`)
- **Webhook Validation**: Validar origem dos webhooks
- **Rate Limiting**: Limitar requisições por instância

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
- [x] Implementar `/api/instance/connect`
- [x] Implementar `/api/instance/disconnect`
- [x] Implementar `/api/instance/status`
- [x] Implementar `/api/conversations`
- [x] Implementar `/api/conversations/:id/messages`
- [x] Implementar `/api/conversations/:id/takeover`
- [x] Implementar `/api/products`
- [ ] Implementar `/api/campaigns`
- [ ] Implementar `/api/groups`

### Fase 5: Funcionalidades Avançadas
- [x] Sistema de transbordo (bot → humano)
- [x] Rate limiting
- [x] Upload de imagens (produtos)
- [ ] Campanhas em grupos
- [ ] Gerenciamento de grupos com opt-in

---

## 📚 Documentação Completa

Para mais detalhes, consulte:

- **`docs/ARQUITETURA_BACKEND.md`** - Arquitetura completa
- **`docs/ESPECIFICACAO_TECNICA_BACKEND.md`** - Especificação técnica detalhada
- **`docs/GUIA_RAPIDO_BACKEND.md`** - Guia rápido
- **`SCRIPTS_SUPABASE.sql`** - Scripts SQL e integração Supabase

---

## 🚀 Próximos Passos

1. **Configurar Evolution API** (Docker)
2. **Criar tabelas no Supabase** (ver `SCRIPTS_SUPABASE.sql`)
3. **Implementar webhook** (já implementado em `app/api/webhook/route.ts`)
4. **Substituir mocks por chamadas reais ao Supabase**
5. **Implementar APIs restantes** (campanhas e grupos)

---

**Última atualização:** 2024
**Versão:** 1.0

